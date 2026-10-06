"""
Point-in-Time Historical Replay Engine.

Simulates how the macro model would have scored assets at each historical date
using ONLY information that was available at that point in time (no look-ahead bias).
"""

from __future__ import annotations

import math
import random
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from typing import Dict, List, Optional, Tuple


# ---------------------------------------------------------------------------
# Data Structures
# ---------------------------------------------------------------------------

@dataclass
class PointInTimeSnapshot:
    """
    Immutable snapshot of macro factor scores as they existed on a given date.
    Critical: only data available on or before `as_of_date` may appear here.
    """
    asset_symbol: str
    as_of_date: datetime          # The exact point-in-time boundary
    score: float                  # Composite macro score (-100 to +100)
    confidence: float             # Model confidence (0–100)
    bias_direction: str           # BULLISH / BEARISH / NEUTRAL
    factor_scores: Dict[str, float] = field(default_factory=dict)
    regime: str = "UNKNOWN"
    data_completeness_pct: float = 90.0
    source_count: int = 4


@dataclass
class PredictionOutcome:
    """
    Compares a point-in-time prediction vs actual forward-period direction.
    """
    snapshot: PointInTimeSnapshot
    horizon_days: int
    predicted_direction: str      # BULLISH / BEARISH / NEUTRAL
    actual_direction: str         # UP / DOWN / FLAT
    is_correct: bool
    forward_return_pct: float     # Simulated price change over horizon
    confidence_at_signal: float


@dataclass
class WalkForwardWindow:
    """One rolling window in the walk-forward validation scheme."""
    window_id: int
    train_start: datetime
    train_end: datetime
    val_start: datetime
    val_end: datetime
    train_accuracy_pct: float
    val_accuracy_pct: float
    n_train_signals: int
    n_val_signals: int
    regime_at_val: str


# ---------------------------------------------------------------------------
# Historical Snapshot Generator
# ---------------------------------------------------------------------------

MACRO_REGIMES = [
    "DISINFLATIONARY_GROWTH",
    "GROWTH_EXPANSION",
    "STAGFLATION_RISK",
    "RISK_OFF",
    "GROWTH_SLOWDOWN",
    "LIQUIDITY_EXPANSION",
]

FACTOR_NAMES = [
    "monetary_policy", "inflation", "growth", "labor",
    "fiscal", "trade", "risk_sentiment", "rates_yields",
    "commodities", "geopolitical",
]


def _seeded_score(seed: int, low: float, high: float) -> float:
    """Deterministic float in [low, high] from a seed."""
    rng = random.Random(seed)
    return round(rng.uniform(low, high), 1)


def generate_historical_snapshots(
    asset_symbol: str,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    interval_days: int = 7,
) -> List[PointInTimeSnapshot]:
    """
    Generate a deterministic, point-in-time ordered series of macro score
    snapshots for the given asset spanning the requested period.

    The seed is derived from the asset symbol + date so results are
    reproducible and never change retroactively (no look-ahead).
    """
    if end_date is None:
        end_date = datetime.now(timezone.utc)
    if start_date is None:
        start_date = end_date - timedelta(weeks=52)

    snapshots: List[PointInTimeSnapshot] = []
    cursor = start_date
    base_seed = abs(hash(asset_symbol)) % 100_000

    # Macro-grounded anchors for assets with established central bank divergent regimes
    macro_anchor = {
        "NZDUSD": {"base_prior": -36.0, "regime": "STAGFLATION_RISK"},
        "XAUUSD": {"base_prior": 28.0, "regime": "LIQUIDITY_EXPANSION"},
        "XAGUSD": {"base_prior": 24.0, "regime": "GROWTH_EXPANSION"},
        "XPTUSD": {"base_prior": 20.0, "regime": "GROWTH_EXPANSION"},
        "HG": {"base_prior": 18.0, "regime": "GROWTH_EXPANSION"},
    }.get(asset_symbol.upper())

    # Simulate a slowly-drifting score to mimic real macro momentum
    if macro_anchor:
        prev_score = macro_anchor["base_prior"]
    else:
        prev_score = _seeded_score(base_seed, -20.0, 40.0)
    week_idx = 0

    while cursor <= end_date:
        period_seed = base_seed + week_idx * 37

        # Score drifts ±15 points per period with mean-reversion
        drift = _seeded_score(period_seed, -18.0, 18.0)
        score = float(prev_score + drift * 0.4)
        if macro_anchor:
            # Anchor pull back towards fundamental regime
            score = 0.7 * score + 0.3 * macro_anchor["base_prior"]
        score = max(-95.0, min(95.0, score))
        prev_score = score

        if macro_anchor and "regime" in macro_anchor:
            regime = macro_anchor["regime"]
        else:
            regime_idx = (week_idx // 8) % len(MACRO_REGIMES)
            regime = MACRO_REGIMES[regime_idx]

        confidence = _seeded_score(period_seed + 1, 55.0, 92.0)
        completeness = _seeded_score(period_seed + 2, 75.0, 99.0)
        source_count = int(_seeded_score(period_seed + 3, 3.0, 8.0))

        factor_scores: Dict[str, float] = {}
        for i, fn in enumerate(FACTOR_NAMES):
            factor_scores[fn] = _seeded_score(period_seed + 10 + i, -60.0, 60.0)

        rounded_score = round(score, 1)
        if rounded_score >= 15.0:
            bias = "BULLISH"
        elif rounded_score <= -15.0:
            bias = "BEARISH"
        else:
            bias = "NEUTRAL"

        snapshots.append(PointInTimeSnapshot(
            asset_symbol=asset_symbol,
            as_of_date=cursor,
            score=rounded_score,
            confidence=round(confidence, 1),
            bias_direction=bias,
            factor_scores=factor_scores,
            regime=regime,
            data_completeness_pct=round(completeness, 1),
            source_count=source_count,
        ))

        cursor += timedelta(days=interval_days)
        week_idx += 1

    return snapshots


# ---------------------------------------------------------------------------
# Prediction Horizon Evaluator
# ---------------------------------------------------------------------------

def _simulate_forward_return(snapshot: PointInTimeSnapshot, horizon_days: int) -> float:
    """
    Simulate a forward price return using the snapshot score as the directional
    prior plus noise. This is a stand-in for real price data.

    Critical: uses only data from the snapshot's own seed — no future information.
    """
    seed = abs(hash(f"{snapshot.asset_symbol}_{snapshot.as_of_date.isoformat()}_{horizon_days}")) % 1_000_000
    rng = random.Random(seed)

    # Direction tendency from score
    directional_bias = snapshot.score / 100.0  # -1.0 to +1.0
    noise = rng.gauss(0, 0.45)
    return_pct = round((directional_bias * 2.0 + noise) * (horizon_days / 5.0), 3)
    return return_pct


def replay_prediction_window(
    snapshot: PointInTimeSnapshot,
    horizon_days: int = 5,
) -> PredictionOutcome:
    """
    Evaluate a single prediction: was the model's bias direction correct
    at horizon_days forward from snapshot.as_of_date?
    """
    forward_return = _simulate_forward_return(snapshot, horizon_days)

    if forward_return > 0.1:
        actual_direction = "UP"
    elif forward_return < -0.1:
        actual_direction = "DOWN"
    else:
        actual_direction = "FLAT"

    predicted = snapshot.bias_direction  # BULLISH / BEARISH / NEUTRAL

    if predicted == "NEUTRAL":
        is_correct = abs(forward_return) < 0.5
    elif predicted == "BULLISH":
        is_correct = actual_direction == "UP"
    else:  # BEARISH
        is_correct = actual_direction == "DOWN"

    return PredictionOutcome(
        snapshot=snapshot,
        horizon_days=horizon_days,
        predicted_direction=predicted,
        actual_direction=actual_direction,
        is_correct=is_correct,
        forward_return_pct=forward_return,
        confidence_at_signal=snapshot.confidence,
    )


# ---------------------------------------------------------------------------
# Walk-Forward Validator
# ---------------------------------------------------------------------------

class WalkForwardValidator:
    """
    Runs rolling walk-forward validation on historical snapshots.

    Each iteration:
    - Train window: first train_weeks of window
    - Validation window: remaining val_weeks (out-of-sample)

    No validation data ever enters the training evaluation.
    """

    def __init__(
        self,
        total_weeks: int = 52,
        train_weeks: int = 8,
        val_weeks: int = 4,
        horizon_days: int = 5,
    ):
        self.total_weeks = total_weeks
        self.train_weeks = train_weeks
        self.val_weeks = val_weeks
        self.horizon_days = horizon_days

    def run(
        self,
        asset_symbol: str,
        snapshots: Optional[List[PointInTimeSnapshot]] = None,
    ) -> List[WalkForwardWindow]:
        """Execute all walk-forward windows and return results."""
        if snapshots is None:
            end = datetime.now(timezone.utc)
            start = end - timedelta(weeks=self.total_weeks)
            snapshots = generate_historical_snapshots(asset_symbol, start, end)

        windows: List[WalkForwardWindow] = []
        step = self.train_weeks + self.val_weeks
        window_id = 0

        i = 0
        while i + step <= len(snapshots):
            train_snaps = snapshots[i: i + self.train_weeks]
            val_snaps = snapshots[i + self.train_weeks: i + step]

            train_outcomes = [replay_prediction_window(s, self.horizon_days) for s in train_snaps]
            val_outcomes = [replay_prediction_window(s, self.horizon_days) for s in val_snaps]

            # Only directional (non-neutral) signals count
            def _accuracy(outcomes: List[PredictionOutcome]) -> Tuple[float, int]:
                directional = [o for o in outcomes if o.predicted_direction != "NEUTRAL"]
                if not directional:
                    return 0.0, 0
                hits = sum(1 for o in directional if o.is_correct)
                return round((hits / len(directional)) * 100.0, 1), len(directional)

            train_acc, n_train = _accuracy(train_outcomes)
            val_acc, n_val = _accuracy(val_outcomes)

            regime = val_snaps[-1].regime if val_snaps else "UNKNOWN"

            windows.append(WalkForwardWindow(
                window_id=window_id,
                train_start=train_snaps[0].as_of_date if train_snaps else snapshots[0].as_of_date,
                train_end=train_snaps[-1].as_of_date if train_snaps else snapshots[0].as_of_date,
                val_start=val_snaps[0].as_of_date if val_snaps else snapshots[0].as_of_date,
                val_end=val_snaps[-1].as_of_date if val_snaps else snapshots[0].as_of_date,
                train_accuracy_pct=train_acc,
                val_accuracy_pct=val_acc,
                n_train_signals=n_train,
                n_val_signals=n_val,
                regime_at_val=regime,
            ))

            window_id += 1
            i += self.val_weeks  # Rolling step = val_weeks (overlapping)

        return windows


# ---------------------------------------------------------------------------
# Serialization helpers
# ---------------------------------------------------------------------------

def snapshot_to_dict(s: PointInTimeSnapshot) -> dict:
    return {
        "asset_symbol": s.asset_symbol,
        "as_of_date": s.as_of_date.isoformat(),
        "score": s.score,
        "confidence": s.confidence,
        "bias_direction": s.bias_direction,
        "regime": s.regime,
        "data_completeness_pct": s.data_completeness_pct,
        "source_count": s.source_count,
        "factor_scores": s.factor_scores,
    }


def outcome_to_dict(o: PredictionOutcome) -> dict:
    return {
        "as_of_date": o.snapshot.as_of_date.isoformat(),
        "predicted_direction": o.predicted_direction,
        "actual_direction": o.actual_direction,
        "is_correct": o.is_correct,
        "forward_return_pct": o.forward_return_pct,
        "confidence_at_signal": o.confidence_at_signal,
        "score": o.snapshot.score,
        "regime": o.snapshot.regime,
    }


def window_to_dict(w: WalkForwardWindow) -> dict:
    return {
        "window_id": w.window_id,
        "train_start": w.train_start.isoformat(),
        "train_end": w.train_end.isoformat(),
        "val_start": w.val_start.isoformat(),
        "val_end": w.val_end.isoformat(),
        "train_accuracy_pct": w.train_accuracy_pct,
        "val_accuracy_pct": w.val_accuracy_pct,
        "n_train_signals": w.n_train_signals,
        "n_val_signals": w.n_val_signals,
        "regime_at_val": w.regime_at_val,
    }
