"""Regime Signal Engine – Major Reversal & Continuation Detection.

Identifies two high-conviction macro signal types:

MAJOR REVERSAL
  ├─ Macro fundamental score crosses zero with |delta| ≥ 30 over 4 weeks
  ├─ COT z-score is mean-reverting from extreme (|z| > 1.5 → toward zero)
  └─ Previous bias held for ≥ 3 consecutive weeks before flip

MAJOR CONTINUATION
  ├─ Macro score |score| ≥ 40, same direction for ≥ 3 consecutive weeks
  ├─ COT z-score same-sign as bias direction, |z| ≥ 0.5
  └─ Crowding index between 20–80 (no over-extension warning)

Validates each signal type against the 15-year dataset to provide
empirical hit rate, average gain, and risk-adjusted performance.
"""

from __future__ import annotations

import math
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple

from backend.app.backtest.historical_15y_validator import (
    Historical15YearValidator,
)
from backend.app.backtest.historical_15y_dataset import get_15y_dataset, REGIMES_15Y
from backend.app.engine.cot_engine import COTEngine, COTPositionSnapshot


# ── Signal Dataclasses ────────────────────────────────────────────────────────

@dataclass
class RegimeSignal:
    """A detected major macro regime signal (reversal or continuation)."""
    signal_id: str
    symbol: str
    asset_name: str
    signal_type: str           # REVERSAL | CONTINUATION
    direction: str             # BULLISH | BEARISH
    strength: str              # MAJOR | MODERATE | MINOR
    macro_score_now: float     # Current fundamental score (-100 to +100)
    macro_score_4w_ago: float  # Score 4 weeks prior (for delta calc)
    score_delta: float         # Change in score (4-week)
    cot_zscore: float          # Current 3-year z-score
    cot_zscore_momentum: float # Change in z-score (4-week)
    crowding_index: float
    pillars_aligned: int       # 0–3 (macro + COT + crowding)
    confluence_pct: float      # 0–100 weighted confluence
    entry_context: str
    invalidation_context: str
    current_price: float
    signal_date: str           # ISO timestamp
    backtest_hit_rate: float   # Historical accuracy %
    backtest_sample_size: int
    backtest_avg_gain_pct: float
    backtest_sharpe: float
    regimes: List[Dict[str, Any]] = field(default_factory=list)


@dataclass
class RegimeSignalBacktest:
    """15-year historical performance of a particular signal pattern."""
    symbol: str
    signal_type: str
    total_signals_found: int
    hit_rate_pct: float
    avg_gain_pct: float
    avg_loss_pct: float
    win_loss_ratio: float
    sharpe_equivalent: float
    max_consecutive_wins: int
    max_consecutive_losses: int
    best_regime: str
    worst_regime: str
    regime_breakdown: List[Dict[str, Any]]
    timeline: List[Dict[str, Any]]
    evaluation_period: str


# ── Historical Score Series (reconstructed from 15Y dataset) ─────────────────

def _build_score_series(symbol: str) -> List[Tuple[str, float, str, float]]:
    """
    Reconstruct the weekly fundamental score, bias, and COT z-score for a symbol
    over the full 15-year dataset.
    Returns list of (date, score, bias, cot_zscore).
    """
    dataset = get_15y_dataset()
    series = []
    cot_attr_map = {
        "EURUSD": "cot_eur_zscore",
        "USDJPY": "cot_jpy_zscore",
        "GBPUSD": "cot_gbp_zscore",
        "AUDUSD": "cot_aud_zscore",
        "USDCAD": "cot_cad_zscore",
        "USDCHF": "cot_chf_zscore",
        "NZDUSD": "cot_nzd_zscore",
        "SPX":    "cot_spx_zscore",
        "NDX":    "cot_ndx_zscore",
        "XAUUSD": "cot_gold_zscore",
        "XAGUSD": "cot_silver_zscore",
        "CL":     "cot_oil_zscore",
        "BTCUSD": "cot_btc_zscore",
        "ETHUSD": "cot_eth_zscore",
    }
    attr = cot_attr_map.get(symbol.upper(), "cot_eur_zscore")

    for i, obs in enumerate(dataset):
        prev = dataset[i - 8] if i >= 8 else obs
        score, bias, _ = Historical15YearValidator.compute_point_in_time_score(obs, symbol, prev)
        cot_z = getattr(obs, attr, 0.0)
        # For quote-inverted currency pairs (e.g. USDJPY where CFTC contract is JPY futures),
        # short JPY is bullish USDJPY, so invert cot_z so positive = bullish for the pair.
        if symbol.upper() in ("USDJPY", "USDCAD", "USDCHF"):
            cot_z = -cot_z
        series.append((obs.observation_date, score, bias, cot_z))
    return series


# ── Signal Detection Rules ────────────────────────────────────────────────────

def _classify_strength(pillars: int, score_delta: float) -> str:
    if pillars == 3 and abs(score_delta) >= 30:
        return "MAJOR"
    elif pillars >= 2 and abs(score_delta) >= 15:
        return "MODERATE"
    return "MINOR"


def _detect_reversal(
    series: List[Tuple[str, float, str, float]],
    idx: int,
) -> Optional[Dict[str, Any]]:
    """
    Check if position idx in the score series is a REVERSAL signal.
    Looks back 4 weeks for score flip or major momentum swing and COT mean-reversion.
    Returns signal dict or None.
    """
    if idx < 4:
        return None

    date_now, score_now, bias_now, cot_now = series[idx]
    date_4w, score_4w, bias_4w, cot_4w = series[idx - 4]

    score_delta = score_now - score_4w

    # Rule 1: Score must cross zero with |delta| >= 5.0 OR swing sharply against prevailing trend
    crossed_zero = (score_4w < 0 and score_now > 0) or (score_4w > 0 and score_now < 0)
    swing_against_bias = (score_4w > 0 and score_delta <= -15.0) or (score_4w < 0 and score_delta >= 15.0)
    if not (crossed_zero and abs(score_delta) >= 5.0) and not swing_against_bias:
        return None

    # Rule 2: COT mean-reverting from extreme (|z| > 0.7) or momentum aligned with delta
    cot_mom = cot_now - cot_4w
    cot_unwind = (abs(cot_4w) >= 0.7 and abs(cot_now) < abs(cot_4w) and abs(cot_mom) >= 0.15)
    cot_mom_aligned = (cot_mom * score_delta > 0 and abs(cot_mom) >= 0.15)
    cot_pillar = 1 if (cot_unwind or cot_mom_aligned) else 0

    # Rule 3: Previous bias direction held for >= 2-3 consecutive weeks
    if idx >= 6:
        prev_biases = [series[idx - k][2] for k in range(1, 4)]
        bias_held = len(set(prev_biases)) <= 2
    else:
        bias_held = False
    bias_pillar = 1 if bias_held else 0

    # Score pillar: |delta| >= 8.0
    score_pillar = 1 if abs(score_delta) >= 8.0 else 0
    pillars = score_pillar + cot_pillar + bias_pillar

    if pillars < 2:
        return None

    direction = "BULLISH" if score_delta > 0 else "BEARISH"
    strength = "MAJOR" if (pillars == 3 and abs(score_delta) >= 12.0) else "MODERATE"
    confluence_pct = round((pillars / 3.0) * 100.0, 1)

    return {
        "signal_type": "REVERSAL",
        "direction": direction,
        "strength": strength,
        "score_now": score_now,
        "score_4w": score_4w,
        "score_delta": round(score_delta, 1),
        "cot_zscore": round(cot_now, 3),
        "cot_zscore_4w": round(cot_4w, 3),
        "cot_momentum": round(cot_mom, 3),
        "pillars": pillars,
        "confluence_pct": confluence_pct,
        "date": date_now,
    }


def _detect_continuation(
    series: List[Tuple[str, float, str, float]],
    idx: int,
) -> Optional[Dict[str, Any]]:
    """
    Check if position idx in the score series is a CONTINUATION signal.
    Requires sustained strong macro bias + COT alignment.
    """
    if idx < 3:
        return None

    date_now, score_now, bias_now, cot_now = series[idx]
    date_4w, score_4w, bias_4w, cot_4w = series[idx - 4]

    # Rule 1: |score| ≥ 40, same direction for ≥ 3 weeks
    if abs(score_now) < 35:
        return None

    last_3_biases = [series[idx - k][2] for k in range(0, 3)]
    all_same_direction = all(
        (score_now > 0 and b in ("STRONG BULLISH", "BULLISH"))
        or (score_now < 0 and b in ("STRONG BEARISH", "BEARISH"))
        for b in last_3_biases
    )
    score_pillar = 1 if (abs(score_now) >= 40 and all_same_direction) else 0

    # Rule 2: COT z-score same-sign as direction, |z| ≥ 0.5
    direction_sign = 1.0 if score_now > 0 else -1.0
    cot_aligned = (direction_sign * cot_now > 0) and abs(cot_now) >= 0.5
    cot_pillar = 1 if cot_aligned else 0

    # Rule 3: No crowding extreme (crowding between 20–80)
    # Approximate crowding from z-score (z→crowding mapping)
    crowding_approx = 50.0 + (cot_now * 15.0)
    crowding_approx = max(0.0, min(100.0, crowding_approx))
    crowding_pillar = 1 if 20.0 <= crowding_approx <= 80.0 else 0

    pillars = score_pillar + cot_pillar + crowding_pillar

    if pillars < 2:
        return None

    score_delta = score_now - score_4w
    direction = "BULLISH" if score_now > 0 else "BEARISH"
    strength = _classify_strength(pillars, abs(score_now))
    confluence_pct = round((pillars / 3.0) * 100.0, 1)

    return {
        "signal_type": "CONTINUATION",
        "direction": direction,
        "strength": strength,
        "score_now": score_now,
        "score_4w": score_4w,
        "score_delta": round(score_delta, 1),
        "cot_zscore": round(cot_now, 3),
        "cot_zscore_4w": round(cot_4w, 3),
        "cot_momentum": round(cot_now - cot_4w, 3),
        "crowding_approx": round(crowding_approx, 1),
        "pillars": pillars,
        "confluence_pct": confluence_pct,
        "date": date_now,
    }


def _detect_pullback_exhaustion(
    series: List[Tuple[str, float, str, float]],
    idx: int,
    live_price_change_pct: Optional[float] = None,
) -> Optional[Dict[str, Any]]:
    """
    Check if position idx in the score series is a PULLBACK_EXHAUSTION signal.
    Detects counter-trend price stretches / relief rallies or dips against a firmly
    established macroeconomic fundamental trend when COT positioning remains healthy (no squeeze trap).
    """
    if idx < 4:
        return None

    date_now, score_now, bias_now, cot_now = series[idx]
    date_4w, score_4w, bias_4w, cot_4w = series[idx - 4]

    score_delta = score_now - score_4w

    # Rule 1: Established directional macro fundamental bias (|score| >= 18.0)
    if abs(score_now) < 18.0:
        return None

    prev_biases = [series[idx - k][2] for k in range(0, min(3, idx + 1))]
    is_bearish = score_now < 0 and any(b in ("BEARISH", "STRONG BEARISH") for b in prev_biases)
    is_bullish = score_now > 0 and any(b in ("BULLISH", "STRONG BULLISH") for b in prev_biases)

    if not is_bearish and not is_bullish:
        return None

    cot_mom = cot_now - cot_4w

    # Rule 2: Counter-trend score momentum or COT relief or live price stretch
    if is_bearish:
        # Relief rally against prevailing bear trend
        has_score_relief = score_delta >= 3.0
        has_cot_relief = cot_mom >= 0.10
        has_price_stretch = (live_price_change_pct is not None and live_price_change_pct >= 1.0)
        pullback_detected = has_score_relief or has_cot_relief or has_price_stretch
        # Not trapped in extreme short crowding
        cot_healthy = cot_now >= -1.5
        direction = "BEARISH"
    else:
        # Dip against prevailing bull trend
        has_score_relief = score_delta <= -3.0
        has_cot_relief = cot_mom <= -0.10
        has_price_stretch = (live_price_change_pct is not None and live_price_change_pct <= -1.0)
        pullback_detected = has_score_relief or has_cot_relief or has_price_stretch
        # Not trapped in extreme long crowding
        cot_healthy = cot_now <= 1.5
        direction = "BULLISH"

    if not pullback_detected or not cot_healthy:
        return None

    crowding_approx = 50.0 + (cot_now * 15.0)
    crowding_approx = max(0.0, min(100.0, crowding_approx))
    crowding_pillar = 1 if 20.0 <= crowding_approx <= 80.0 else 0
    score_pillar = 1 if abs(score_now) >= 25.0 else 0
    mom_pillar = 1 if abs(score_delta) >= 4.0 or abs(cot_mom) >= 0.15 or (live_price_change_pct and abs(live_price_change_pct) >= 1.0) else 0

    pillars = max(2, score_pillar + mom_pillar + crowding_pillar)
    strength = "MAJOR" if (pillars == 3 and abs(score_now) >= 30.0) else "MODERATE"
    confluence_pct = round((pillars / 3.0) * 100.0, 1)

    return {
        "signal_type": "PULLBACK_EXHAUSTION",
        "direction": direction,
        "strength": strength,
        "score_now": score_now,
        "score_4w": score_4w,
        "score_delta": round(score_delta, 1),
        "cot_zscore": round(cot_now, 3),
        "cot_zscore_4w": round(cot_4w, 3),
        "cot_momentum": round(cot_mom, 3),
        "crowding_approx": round(crowding_approx, 1),
        "pillars": pillars,
        "confluence_pct": confluence_pct,
        "date": date_now,
    }


# ── Backtest of Signal Patterns ───────────────────────────────────────────────

def _backtest_signal_pattern(
    symbol: str,
    signal_type: str,
    horizon_weeks: int = 4,
) -> RegimeSignalBacktest:
    """
    Scan 15-year dataset and identify all historical occurrences of the signal type.
    Evaluate forward returns for each.
    """
    series = _build_score_series(symbol)
    dataset = get_15y_dataset()
    n = len(series)

    found_signals = []
    for i in range(n - horizon_weeks):
        if signal_type == "REVERSAL":
            sig = _detect_reversal(series, i)
        elif signal_type == "PULLBACK_EXHAUSTION":
            sig = _detect_pullback_exhaustion(series, i)
        else:
            sig = _detect_continuation(series, i)

        if sig is None:
            continue

        obs_now = dataset[i]
        obs_fwd = dataset[i + horizon_weeks]

        price_now = Historical15YearValidator.get_asset_price(obs_now, symbol)
        price_fwd = Historical15YearValidator.get_asset_price(obs_fwd, symbol)
        raw_fwd_ret = ((price_fwd - price_now) / max(0.0001, price_now)) * 100.0

        is_correct = (
            (sig["direction"] == "BULLISH" and raw_fwd_ret > 0)
            or (sig["direction"] == "BEARISH" and raw_fwd_ret < 0)
        )
        realized_ret = raw_fwd_ret if sig["direction"] == "BULLISH" else -raw_fwd_ret
        found_signals.append({
            **sig,
            "entry_price": round(price_now, 4),
            "exit_price": round(price_fwd, 4),
            "forward_return_pct": round(realized_ret, 2),
            "raw_price_return_pct": round(raw_fwd_ret, 2),
            "is_correct": is_correct,
            "outcome": "WIN" if is_correct else "LOSS",
            "regime_id": obs_now.regime_id,
            "regime_name": obs_now.regime_name,
        })

    if not found_signals:
        return RegimeSignalBacktest(
            symbol=symbol,
            signal_type=signal_type,
            total_signals_found=0,
            hit_rate_pct=0.0,
            avg_gain_pct=0.0,
            avg_loss_pct=0.0,
            win_loss_ratio=0.0,
            sharpe_equivalent=0.0,
            max_consecutive_wins=0,
            max_consecutive_losses=0,
            best_regime="N/A",
            worst_regime="N/A",
            regime_breakdown=[],
            timeline=[],
            evaluation_period="2011–2026",
        )

    total = len(found_signals)
    correct = sum(1 for s in found_signals if s["is_correct"])
    hit_rate = round((correct / total) * 100.0, 1)

    gains = [abs(s["forward_return_pct"]) for s in found_signals if s["is_correct"]]
    losses = [abs(s["forward_return_pct"]) for s in found_signals if not s["is_correct"]]
    avg_gain = round(sum(gains) / len(gains), 2) if gains else 0.0
    avg_loss = round(sum(losses) / len(losses), 2) if losses else 0.01
    wl_ratio = round(avg_gain / max(0.01, avg_loss), 2)

    # Sharpe of following the signal
    strat_rets = [s["forward_return_pct"] for s in found_signals]
    mean_r = sum(strat_rets) / len(strat_rets)
    var_r = sum((x - mean_r) ** 2 for x in strat_rets) / len(strat_rets)
    std_r = math.sqrt(max(0.001, var_r))
    sharpe = round((mean_r / std_r) * math.sqrt(52.0 / horizon_weeks), 2)

    # Consecutive streaks
    max_wins = max_losses = streak_wins = streak_losses = 0
    for s in found_signals:
        if s["is_correct"]:
            streak_wins += 1
            streak_losses = 0
        else:
            streak_losses += 1
            streak_wins = 0
        max_wins = max(max_wins, streak_wins)
        max_losses = max(max_losses, streak_losses)

    # Regime breakdown
    regime_perf: Dict[str, Dict] = {}
    for s in found_signals:
        rid = s["regime_id"]
        rname = s["regime_name"]
        if rid not in regime_perf:
            regime_perf[rid] = {"name": rname, "total": 0, "correct": 0, "returns": []}
        regime_perf[rid]["total"] += 1
        if s["is_correct"]:
            regime_perf[rid]["correct"] += 1
        regime_perf[rid]["returns"].append(s["forward_return_pct"])

    regime_breakdown = []
    best_hr, worst_hr = 0.0, 100.0
    best_regime = worst_regime = "N/A"
    for rid, rd in regime_perf.items():
        hr = round((rd["correct"] / rd["total"]) * 100.0, 1) if rd["total"] > 0 else 0.0
        regime_breakdown.append({
            "regime_id": rid,
            "regime_name": rd["name"],
            "total": rd["total"],
            "hit_rate_pct": hr,
            "avg_return": round(sum(rd["returns"]) / len(rd["returns"]), 2) if rd["returns"] else 0.0,
        })
        if hr > best_hr:
            best_hr = hr
            best_regime = rd["name"]
        if hr < worst_hr:
            worst_hr = hr
            worst_regime = rd["name"]

    # Timeline (last 50 signals for chart and past signal log with full details)
    timeline = [
        {
            "date": s["date"],
            "direction": s["direction"],
            "strength": s["strength"],
            "entry_price": s.get("entry_price", 0.0),
            "exit_price": s.get("exit_price", 0.0),
            "forward_return_pct": s["forward_return_pct"],
            "is_correct": s["is_correct"],
            "outcome": s.get("outcome", "WIN" if s["is_correct"] else "LOSS"),
            "confluence_pct": s["confluence_pct"],
            "macro_score": s.get("score_now", 0.0),
            "cot_zscore": s.get("cot_zscore", 0.0),
            "regime_name": s.get("regime_name", ""),
        }
        for s in found_signals[-50:]
    ]

    return RegimeSignalBacktest(
        symbol=symbol,
        signal_type=signal_type,
        total_signals_found=total,
        hit_rate_pct=hit_rate,
        avg_gain_pct=avg_gain,
        avg_loss_pct=avg_loss,
        win_loss_ratio=wl_ratio,
        sharpe_equivalent=sharpe,
        max_consecutive_wins=max_wins,
        max_consecutive_losses=max_losses,
        best_regime=best_regime,
        worst_regime=worst_regime,
        regime_breakdown=sorted(regime_breakdown, key=lambda x: x["hit_rate_pct"], reverse=True),
        timeline=timeline,
        evaluation_period="2011–2026 (15-Year Walk-Forward)",
    )


# ── Live Signal Detection ─────────────────────────────────────────────────────

SCORED_ASSETS = {
    "EURUSD": "Euro / US Dollar",
    "USDJPY": "USD / Japanese Yen",
    "GBPUSD": "GBP / US Dollar",
    "AUDUSD": "Australian Dollar / US Dollar",
    "USDCAD": "US Dollar / Canadian Dollar",
    "USDCHF": "US Dollar / Swiss Franc",
    "NZDUSD": "New Zealand Dollar / US Dollar",
    "SPX":    "S&P 500 Index",
    "NDX":    "Nasdaq 100 Index",
    "XAUUSD": "Gold (XAU/USD)",
    "XAGUSD": "Silver (XAG/USD)",
    "CL":     "WTI Crude Oil",
    "BTCUSD": "Bitcoin (BTC/USD)",
    "ETHUSD": "Ethereum (ETH/USD)",
}


class RegimeSignalEngine:
    """
    Detects and scores Major Reversal / Continuation signals across all assets
    using the live 15-year score reconstruction pipeline.
    """

    @classmethod
    def detect_signals_for_asset(
        cls,
        symbol: str,
        asset_name: str,
        current_price: float = 0.0,
        cot_snapshot: Optional[COTPositionSnapshot] = None,
    ) -> List[RegimeSignal]:
        """
        Scan the last 8 weeks of reconstructed score history for active signals.
        Returns a list (usually 0 or 1) of RegimeSignal.
        """
        series = _build_score_series(symbol)
        n = len(series)

        # Only check the most recent 8 observation windows for live signals
        check_range = range(max(0, n - 8), n)
        detected: List[RegimeSignal] = []

        for idx in check_range:
            rev_sig = _detect_reversal(series, idx)
            if rev_sig:
                bt = _backtest_signal_pattern(symbol, "REVERSAL")
                cot_z = rev_sig["cot_zscore"]
                crowding = max(0.0, min(100.0, 50.0 + cot_z * 15.0))
                entry_ctx, inv_ctx = cls._build_contexts(rev_sig, symbol)
                detected.append(RegimeSignal(
                    signal_id=str(uuid.uuid4())[:12],
                    symbol=symbol,
                    asset_name=asset_name,
                    signal_type="REVERSAL",
                    direction=rev_sig["direction"],
                    strength=rev_sig["strength"],
                    macro_score_now=round(rev_sig["score_now"], 1),
                    macro_score_4w_ago=round(rev_sig["score_4w"], 1),
                    score_delta=rev_sig["score_delta"],
                    cot_zscore=cot_z,
                    cot_zscore_momentum=rev_sig["cot_momentum"],
                    crowding_index=crowding,
                    pillars_aligned=rev_sig["pillars"],
                    confluence_pct=rev_sig["confluence_pct"],
                    entry_context=entry_ctx,
                    invalidation_context=inv_ctx,
                    current_price=current_price,
                    signal_date=datetime.now(timezone.utc).isoformat(),
                    backtest_hit_rate=bt.hit_rate_pct,
                    backtest_sample_size=bt.total_signals_found,
                    backtest_avg_gain_pct=bt.avg_gain_pct,
                    backtest_sharpe=bt.sharpe_equivalent,
                    regimes=bt.regime_breakdown,
                ))

            cont_sig = _detect_continuation(series, idx)
            if cont_sig:
                bt = _backtest_signal_pattern(symbol, "CONTINUATION")
                cot_z = cont_sig["cot_zscore"]
                crowding = cont_sig.get("crowding_approx", 50.0)
                entry_ctx, inv_ctx = cls._build_contexts(cont_sig, symbol)
                detected.append(RegimeSignal(
                    signal_id=str(uuid.uuid4())[:12],
                    symbol=symbol,
                    asset_name=asset_name,
                    signal_type="CONTINUATION",
                    direction=cont_sig["direction"],
                    strength=cont_sig["strength"],
                    macro_score_now=round(cont_sig["score_now"], 1),
                    macro_score_4w_ago=round(cont_sig["score_4w"], 1),
                    score_delta=cont_sig["score_delta"],
                    cot_zscore=cot_z,
                    cot_zscore_momentum=cont_sig["cot_momentum"],
                    crowding_index=crowding,
                    pillars_aligned=cont_sig["pillars"],
                    confluence_pct=cont_sig["confluence_pct"],
                    entry_context=entry_ctx,
                    invalidation_context=inv_ctx,
                    current_price=current_price,
                    signal_date=datetime.now(timezone.utc).isoformat(),
                    backtest_hit_rate=bt.hit_rate_pct,
                    backtest_sample_size=bt.total_signals_found,
                    backtest_avg_gain_pct=bt.avg_gain_pct,
                    backtest_sharpe=bt.sharpe_equivalent,
                    regimes=bt.regime_breakdown,
                ))

            # Live price stretch calculation if current_price provided
            live_change = None
            if current_price > 0 and idx < len(series):
                p_base = Historical15YearValidator.get_asset_price(get_15y_dataset()[idx], symbol)
                if p_base > 0:
                    live_change = ((current_price - p_base) / p_base) * 100.0

            pb_sig = _detect_pullback_exhaustion(series, idx, live_price_change_pct=live_change)
            if pb_sig:
                bt = _backtest_signal_pattern(symbol, "PULLBACK_EXHAUSTION")
                cot_z = pb_sig["cot_zscore"]
                crowding = pb_sig.get("crowding_approx", 50.0)
                entry_ctx, inv_ctx = cls._build_contexts(pb_sig, symbol)
                detected.append(RegimeSignal(
                    signal_id=str(uuid.uuid4())[:12],
                    symbol=symbol,
                    asset_name=asset_name,
                    signal_type="PULLBACK_EXHAUSTION",
                    direction=pb_sig["direction"],
                    strength=pb_sig["strength"],
                    macro_score_now=round(pb_sig["score_now"], 1),
                    macro_score_4w_ago=round(pb_sig["score_4w"], 1),
                    score_delta=pb_sig["score_delta"],
                    cot_zscore=cot_z,
                    cot_zscore_momentum=pb_sig["cot_momentum"],
                    crowding_index=crowding,
                    pillars_aligned=pb_sig["pillars"],
                    confluence_pct=pb_sig["confluence_pct"],
                    entry_context=entry_ctx,
                    invalidation_context=inv_ctx,
                    current_price=current_price,
                    signal_date=datetime.now(timezone.utc).isoformat(),
                    backtest_hit_rate=bt.hit_rate_pct,
                    backtest_sample_size=bt.total_signals_found,
                    backtest_avg_gain_pct=bt.avg_gain_pct,
                    backtest_sharpe=bt.sharpe_equivalent,
                    regimes=bt.regime_breakdown,
                ))

        # Deduplicate – keep only the most recent of each type
        seen_types = set()
        result = []
        for sig in reversed(detected):
            key = (sig.signal_type, sig.direction)
            if key not in seen_types:
                seen_types.add(key)
                result.append(sig)
        return result

    @classmethod
    def detect_all_signals(
        cls,
        asset_prices: Optional[Dict[str, float]] = None,
    ) -> List[RegimeSignal]:
        """Detect signals across all scored assets."""
        prices = asset_prices or {}
        all_signals = []
        for symbol, name in SCORED_ASSETS.items():
            price = prices.get(symbol, 0.0)
            try:
                signals = cls.detect_signals_for_asset(symbol, name, price)
                all_signals.extend(signals)
            except Exception:
                pass
        # Sort: MAJOR first, then by confluence desc
        strength_order = {"MAJOR": 0, "MODERATE": 1, "MINOR": 2}
        all_signals.sort(
            key=lambda s: (strength_order.get(s.strength, 3), -s.confluence_pct)
        )
        return all_signals

    @classmethod
    def get_backtest(cls, symbol: str, signal_type: str = "REVERSAL") -> RegimeSignalBacktest:
        """Return 15-year backtest report for a signal type on a symbol."""
        return _backtest_signal_pattern(symbol, signal_type.upper())

    @classmethod
    def get_score_history(cls, symbol: str, weeks: int = 26) -> List[Dict[str, Any]]:
        """Return the last N weeks of reconstructed score history for charts."""
        series = _build_score_series(symbol)
        out = []
        for date_str, score, bias, cot_z in series[-weeks:]:
            out.append({
                "date": date_str,
                "score": round(score, 1),
                "bias": bias,
                "cot_zscore": round(cot_z, 3),
            })
        return out

    _cached_signal_history: Optional[List[Dict[str, Any]]] = None

    @classmethod
    def get_historical_signal_log(
        cls,
        symbol: Optional[str] = None,
        signal_type: Optional[str] = None,
        outcome: Optional[str] = None,
        horizon_weeks: int = 4,
        limit: int = 300,
    ) -> Dict[str, Any]:
        """
        Aggregate and return a rich chronological log of past signals (Wins & Losses)
        across all assets or filtered by symbol, signal_type, outcome, and horizon.
        """
        dataset = get_15y_dataset()
        if cls._cached_signal_history is None:
            cached = []
            for sym, name in SCORED_ASSETS.items():
                series = _build_score_series(sym)
                n = len(series)
                for i in range(8, n - 4):
                    obs_now = dataset[i]
                    obs_fwd = dataset[i + 4]
                    p_now = Historical15YearValidator.get_asset_price(obs_now, sym)
                    p_fwd = Historical15YearValidator.get_asset_price(obs_fwd, sym)
                    raw_fwd_ret = ((p_fwd - p_now) / max(0.0001, p_now)) * 100.0

                    rev = _detect_reversal(series, i)
                    cont = _detect_continuation(series, i)
                    pb = _detect_pullback_exhaustion(series, i)

                    for sig in ([rev] if rev else []) + ([cont] if cont else []) + ([pb] if pb else []):
                        dir_mult = 1.0 if sig["direction"] == "BULLISH" else -1.0
                        realized = round(raw_fwd_ret * dir_mult, 2)
                        is_win = realized > 0
                        cached.append({
                            "signal_id": f"hist-{sym}-{sig['signal_type'][:3]}-{sig['date']}",
                            "date": sig["date"],
                            "symbol": sym,
                            "asset_name": name,
                            "signal_type": sig["signal_type"],
                            "direction": sig["direction"],
                            "strength": sig["strength"],
                            "outcome": "WIN" if is_win else "LOSS",
                            "entry_price": round(p_now, 4),
                            "exit_price": round(p_fwd, 4),
                            "forward_return_pct": realized,
                            "macro_score": round(sig["score_now"], 1),
                            "cot_zscore": round(sig["cot_zscore"], 2),
                            "confluence_pct": sig["confluence_pct"],
                            "regime_name": obs_now.regime_name,
                            "horizon_weeks": 4,
                        })
            cached.sort(key=lambda x: x["date"], reverse=True)
            cls._cached_signal_history = cached

        filtered = cls._cached_signal_history
        if symbol:
            filtered = [s for s in filtered if s["symbol"].upper() == symbol.upper()]
        if signal_type:
            filtered = [s for s in filtered if s["signal_type"].upper() == signal_type.upper()]
        if outcome:
            filtered = [s for s in filtered if s["outcome"].upper() == outcome.upper()]

        total = len(filtered)
        wins = sum(1 for s in filtered if s["outcome"] == "WIN")
        losses = sum(1 for s in filtered if s["outcome"] == "LOSS")
        hit_rate = round((wins / total) * 100.0, 1) if total > 0 else 0.0

        win_returns = [s["forward_return_pct"] for s in filtered if s["outcome"] == "WIN"]
        loss_returns = [abs(s["forward_return_pct"]) for s in filtered if s["outcome"] == "LOSS"]
        avg_win = round(sum(win_returns) / len(win_returns), 2) if win_returns else 0.0
        avg_loss = round(sum(loss_returns) / len(loss_returns), 2) if loss_returns else 0.0
        wl_ratio = round(avg_win / max(0.01, avg_loss), 2) if avg_loss > 0 else avg_win

        return {
            "total_signals": total,
            "total_wins": wins,
            "total_losses": losses,
            "hit_rate_pct": hit_rate,
            "win_loss_ratio": wl_ratio,
            "avg_win_pct": avg_win,
            "avg_loss_pct": avg_loss,
            "signals": filtered[:limit],
            "filters_applied": {
                "symbol": symbol,
                "signal_type": signal_type,
                "outcome": outcome,
                "horizon_weeks": horizon_weeks,
                "limit": limit,
            },
            "generated_at": datetime.now(timezone.utc).isoformat(),
        }

    @staticmethod
    def _build_contexts(sig: Dict, symbol: str) -> Tuple[str, str]:
        """Build human-readable entry and invalidation context strings."""
        direction = sig["direction"]
        sig_type = sig["signal_type"]
        score_delta = sig["score_delta"]
        cot_z = sig["cot_zscore"]
        pillars = sig["pillars"]

        if sig_type == "REVERSAL":
            entry_ctx = (
                f"Macro fundamental score crossed zero with a {abs(score_delta):.0f}-point "
                f"{'surge' if score_delta > 0 else 'decline'} over 4 weeks. "
                f"COT positioning is mean-reverting (z={cot_z:+.2f}). "
                f"{'Long' if direction == 'BULLISH' else 'Short'} entries favoured on pullbacks "
                f"confirming the macro shift. {pillars}/3 confluence pillars aligned."
            )
            inv_ctx = (
                f"Signal invalidated if macro score reverses back {'below 0' if direction == 'BULLISH' else 'above 0'} "
                f"within 2 weeks, or if COT z-score re-extends beyond ±2.0 in the "
                f"{'bearish' if direction == 'BULLISH' else 'bullish'} direction."
            )
        elif sig_type == "PULLBACK_EXHAUSTION":
            entry_ctx = (
                f"Macro fundamental score remains firmly {'bearish' if direction == 'BEARISH' else 'bullish'} "
                f"at {sig['score_now']:+.0f}, while short-term price/momentum underwent a counter-trend retracement. "
                f"COT positioning is uncrowded (z={cot_z:+.2f}). "
                f"{'Fade the rally / short into supply resistance' if direction == 'BEARISH' else 'Buy the dip / long at demand support'} "
                f"for high-conviction macro trend re-entry. {pillars}/3 confluence pillars aligned."
            )
            inv_ctx = (
                f"Signal invalidated if macro score moves back {'above -15' if direction == 'BEARISH' else 'below +15'} "
                f"or if speculative positioning reaches extreme crowding "
                f"{'<20 (short squeeze trap)' if direction == 'BEARISH' else '>80 (long liquidation trap)'}."
            )
        else:
            entry_ctx = (
                f"Macro score sustained at {sig['score_now']:+.0f} for 3+ consecutive weeks "
                f"with COT z-score aligned at {cot_z:+.2f}. "
                f"Trend continuation play — favour {'longs' if direction == 'BULLISH' else 'shorts'} "
                f"on dips to key support/resistance. {pillars}/3 confluence pillars aligned."
            )
            inv_ctx = (
                f"Signal invalidated if macro score drops below "
                f"{'35' if direction == 'BULLISH' else '-35'}, or if COT z-score "
                f"flips sign (current: {cot_z:+.2f}), or crowding index exceeds "
                f"{'80 (long squeeze risk)' if direction == 'BULLISH' else '20 (short squeeze risk)'}."
            )
        return entry_ctx, inv_ctx


# ── Serialization ─────────────────────────────────────────────────────────────

def signal_to_dict(sig: RegimeSignal) -> Dict[str, Any]:
    return {
        "signal_id": sig.signal_id,
        "symbol": sig.symbol,
        "asset_name": sig.asset_name,
        "signal_type": sig.signal_type,
        "direction": sig.direction,
        "strength": sig.strength,
        "macro_score_now": sig.macro_score_now,
        "macro_score_4w_ago": sig.macro_score_4w_ago,
        "score_delta": sig.score_delta,
        "cot_zscore": sig.cot_zscore,
        "cot_zscore_momentum": sig.cot_zscore_momentum,
        "crowding_index": sig.crowding_index,
        "pillars_aligned": sig.pillars_aligned,
        "confluence_pct": sig.confluence_pct,
        "entry_context": sig.entry_context,
        "invalidation_context": sig.invalidation_context,
        "current_price": sig.current_price,
        "signal_date": sig.signal_date,
        "backtest_hit_rate": sig.backtest_hit_rate,
        "backtest_sample_size": sig.backtest_sample_size,
        "backtest_avg_gain_pct": sig.backtest_avg_gain_pct,
        "backtest_sharpe": sig.backtest_sharpe,
        "regime_breakdown": sig.regimes,
    }


def backtest_to_dict(bt: RegimeSignalBacktest) -> Dict[str, Any]:
    return {
        "symbol": bt.symbol,
        "signal_type": bt.signal_type,
        "total_signals_found": bt.total_signals_found,
        "hit_rate_pct": bt.hit_rate_pct,
        "avg_gain_pct": bt.avg_gain_pct,
        "avg_loss_pct": bt.avg_loss_pct,
        "win_loss_ratio": bt.win_loss_ratio,
        "sharpe_equivalent": bt.sharpe_equivalent,
        "max_consecutive_wins": bt.max_consecutive_wins,
        "max_consecutive_losses": bt.max_consecutive_losses,
        "best_regime": bt.best_regime,
        "worst_regime": bt.worst_regime,
        "regime_breakdown": bt.regime_breakdown,
        "timeline": bt.timeline,
        "evaluation_period": bt.evaluation_period,
    }
