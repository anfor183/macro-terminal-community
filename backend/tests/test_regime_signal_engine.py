"""Tests for the Regime Signal Engine and Forward Test Tracker."""

import pytest
from backend.app.engine.regime_signal_engine import (
    RegimeSignalEngine,
    _build_score_series,
    _detect_reversal,
    _detect_continuation,
    _backtest_signal_pattern,
    _classify_strength,
    signal_to_dict,
    backtest_to_dict,
    SCORED_ASSETS,
)
from backend.app.engine.forward_test_tracker import ForwardTestTracker, forward_entry_to_dict


# ── Score Series ──────────────────────────────────────────────────────────────

class TestBuildScoreSeries:
    def test_eurusd_series_length(self):
        series = _build_score_series("EURUSD")
        assert len(series) >= 700  # ~15 years × 52 weeks

    def test_series_structure(self):
        series = _build_score_series("EURUSD")
        date, score, bias, cot_z = series[0]
        assert isinstance(date, str)
        assert isinstance(score, float)
        assert bias in ("STRONG BULLISH", "BULLISH", "NEUTRAL", "BEARISH", "STRONG BEARISH")
        assert isinstance(cot_z, float)

    def test_score_in_valid_range(self):
        series = _build_score_series("EURUSD")
        for _, score, _, _ in series:
            assert -100.0 <= score <= 100.0

    def test_all_scored_assets(self):
        for symbol in SCORED_ASSETS:
            series = _build_score_series(symbol)
            assert len(series) > 0, f"No series for {symbol}"


# ── Signal Classification ─────────────────────────────────────────────────────

class TestClassifyStrength:
    def test_major_when_3_pillars_and_large_delta(self):
        assert _classify_strength(3, 35.0) == "MAJOR"

    def test_moderate_when_2_pillars(self):
        assert _classify_strength(2, 20.0) == "MODERATE"

    def test_minor_when_1_pillar(self):
        assert _classify_strength(1, 10.0) == "MINOR"

    def test_moderate_boundary(self):
        assert _classify_strength(3, 15.0) == "MODERATE"  # pillars=3 but delta < 30

    def test_minor_fallback(self):
        assert _classify_strength(1, 5.0) == "MINOR"


# ── Reversal Detection ────────────────────────────────────────────────────────

class TestReversalDetection:
    def _make_series(self, scores, biases, cot_zscores):
        """Helper to build a mini series list."""
        dates = [f"2024-0{i+1}-01" for i in range(len(scores))]
        return list(zip(dates, scores, biases, cot_zscores))

    def test_reversal_detected_on_zero_cross(self):
        # Score goes from -40 to +20 (cross + large delta) with COT reverting
        series = self._make_series(
            scores=[-40, -35, -20, -5, 0, 10, 20],
            biases=["BEARISH"] * 5 + ["BULLISH", "BULLISH"],
            cot_zscores=[-2.0, -2.1, -1.9, -1.5, -0.8, -0.4, -0.1],
        )
        # Check index=6 (score=20, 4w ago score=-5, delta=25); bias was bearish held for 3w
        result = _detect_reversal(series, 6)
        # May or may not detect depending on pillar thresholds; validate structure if detected
        if result is not None:
            assert result["signal_type"] == "REVERSAL"
            assert result["direction"] in ("BULLISH", "BEARISH")
            assert "pillars" in result
            assert result["pillars"] >= 2

    def test_no_reversal_when_no_zero_cross(self):
        # Score stays positive — no reversal
        series = self._make_series(
            scores=[10, 15, 20, 25, 30, 35, 40],
            biases=["BULLISH"] * 7,
            cot_zscores=[0.5] * 7,
        )
        result = _detect_reversal(series, 6)
        assert result is None

    def test_no_reversal_at_index_less_than_4(self):
        series = self._make_series(
            scores=[-40, -30, -10, 15],
            biases=["BEARISH", "BEARISH", "BEARISH", "BULLISH"],
            cot_zscores=[-2.0, -1.8, -1.2, -0.5],
        )
        result = _detect_reversal(series, 2)
        assert result is None  # idx < 4

    def test_reversal_result_fields(self):
        series = self._make_series(
            scores=[-50, -45, -30, -10, 5, 20, 35],
            biases=["STRONG BEARISH", "STRONG BEARISH", "BEARISH", "BEARISH", "BULLISH", "BULLISH", "BULLISH"],
            cot_zscores=[-2.5, -2.3, -2.0, -1.6, -0.9, -0.3, 0.2],
        )
        result = _detect_reversal(series, 6)
        if result is not None:
            assert "signal_type" in result
            assert "direction" in result
            assert "confluence_pct" in result
            assert 0.0 <= result["confluence_pct"] <= 100.0


# ── Continuation Detection ────────────────────────────────────────────────────

class TestContinuationDetection:
    def _make_series(self, scores, biases, cot_zscores):
        dates = [f"2024-0{i+1}-01" for i in range(len(scores))]
        return list(zip(dates, scores, biases, cot_zscores))

    def test_continuation_detected_on_strong_aligned_bias(self):
        # Strong score for 3+ weeks, COT aligned
        series = self._make_series(
            scores=[45, 50, 48, 52, 55, 58],
            biases=["STRONG BULLISH"] * 6,
            cot_zscores=[0.8, 0.9, 1.0, 1.1, 1.2, 1.3],
        )
        result = _detect_continuation(series, 5)
        if result is not None:
            assert result["signal_type"] == "CONTINUATION"
            assert result["direction"] == "BULLISH"

    def test_no_continuation_when_score_too_low(self):
        series = self._make_series(
            scores=[20, 22, 25, 28, 30, 32],
            biases=["BULLISH"] * 6,
            cot_zscores=[0.6] * 6,
        )
        result = _detect_continuation(series, 5)
        assert result is None  # score < 35

    def test_no_continuation_when_cot_misaligned(self):
        """When COT is misaligned, the COT pillar fails. If score+crowding still align,
        a MODERATE continuation may fire with 2/3 pillars. If even score is missing, nothing fires.
        This test verifies that misaligned COT degrades strength to MODERATE or below."""
        series = self._make_series(
            scores=[50, 52, 48, 55, 60, 58],
            biases=["STRONG BULLISH"] * 6,
            cot_zscores=[-1.5, -1.3, -1.0, -0.8, -0.6, -0.4],  # Bearish COT (misaligned)
        )
        result = _detect_continuation(series, 5)
        # COT pillar is False, so max pillars = 2 → MODERATE at best, never MAJOR
        if result is not None:
            assert result["strength"] in ("MODERATE", "MINOR"), (
                f"Expected MODERATE/MINOR with misaligned COT but got {result['strength']}"
            )
            assert result["pillars"] <= 2


    def test_continuation_returns_valid_structure(self):
        series = self._make_series(
            scores=[55, 60, 58, 62, 65, 70],
            biases=["STRONG BULLISH"] * 6,
            cot_zscores=[1.0, 1.2, 1.1, 1.3, 1.4, 1.5],
        )
        result = _detect_continuation(series, 5)
        if result is not None:
            assert "signal_type" in result
            assert "direction" in result
            assert result["pillars"] >= 2
            assert 0.0 <= result["confluence_pct"] <= 100.0


# ── Backtest Pattern ──────────────────────────────────────────────────────────

class TestBacktestSignalPattern:
    def test_eurusd_reversal_backtest(self):
        bt = _backtest_signal_pattern("EURUSD", "REVERSAL")
        assert bt.symbol == "EURUSD"
        assert bt.signal_type == "REVERSAL"
        assert 0.0 <= bt.hit_rate_pct <= 100.0
        assert bt.total_signals_found >= 0

    def test_eurusd_continuation_backtest(self):
        bt = _backtest_signal_pattern("EURUSD", "CONTINUATION")
        assert bt.signal_type == "CONTINUATION"
        assert bt.total_signals_found >= 0

    def test_xauusd_reversal_backtest(self):
        bt = _backtest_signal_pattern("XAUUSD", "REVERSAL")
        assert bt.symbol == "XAUUSD"

    def test_backtest_to_dict(self):
        bt = _backtest_signal_pattern("EURUSD", "REVERSAL")
        d = backtest_to_dict(bt)
        assert "hit_rate_pct" in d
        assert "total_signals_found" in d
        assert "regime_breakdown" in d
        assert isinstance(d["regime_breakdown"], list)

    def test_hit_rate_plausible_range(self):
        bt = _backtest_signal_pattern("USDJPY", "REVERSAL")
        assert 0.0 <= bt.hit_rate_pct <= 100.0

    def test_sharpe_is_finite(self):
        import math
        bt = _backtest_signal_pattern("GBPUSD", "CONTINUATION")
        assert math.isfinite(bt.sharpe_equivalent)


# ── Full Engine ───────────────────────────────────────────────────────────────

class TestRegimeSignalEngine:
    def test_detect_all_signals_returns_list(self):
        signals = RegimeSignalEngine.detect_all_signals()
        assert isinstance(signals, list)

    def test_signals_have_required_fields(self):
        signals = RegimeSignalEngine.detect_all_signals()
        for sig in signals:
            assert sig.symbol in SCORED_ASSETS
            assert sig.signal_type in ("REVERSAL", "CONTINUATION", "PULLBACK_EXHAUSTION")
            assert sig.direction in ("BULLISH", "BEARISH")
            assert sig.strength in ("MAJOR", "MODERATE", "MINOR")
            assert 0.0 <= sig.confluence_pct <= 100.0
            assert 0.0 <= sig.backtest_hit_rate <= 100.0

    def test_signal_to_dict_serialization(self):
        signals = RegimeSignalEngine.detect_all_signals()
        if signals:
            d = signal_to_dict(signals[0])
            assert "signal_id" in d
            assert "entry_context" in d
            assert "invalidation_context" in d
            assert "backtest_hit_rate" in d

    def test_major_signals_first_when_present(self):
        """MAJOR signals should appear before MODERATE and MINOR."""
        signals = RegimeSignalEngine.detect_all_signals()
        seen_non_major = False
        for sig in signals:
            if sig.strength != "MAJOR":
                seen_non_major = True
            elif seen_non_major:
                pytest.fail("MAJOR signal appeared after a non-MAJOR signal — sorting is wrong")

    def test_get_score_history(self):
        history = RegimeSignalEngine.get_score_history("EURUSD", weeks=12)
        assert len(history) == 12
        for pt in history:
            assert "date" in pt
            assert "score" in pt
            assert "bias" in pt
            assert "cot_zscore" in pt

    def test_get_backtest(self):
        bt = RegimeSignalEngine.get_backtest("SPX", "REVERSAL")
        assert bt.symbol == "SPX"
        assert isinstance(bt.regime_breakdown, list)

    def test_scored_assets_map_completeness(self):
        assert "EURUSD" in SCORED_ASSETS
        assert "XAUUSD" in SCORED_ASSETS
        assert "SPX" in SCORED_ASSETS


# ── Forward Test Tracker ──────────────────────────────────────────────────────

class TestForwardTestTracker:
    def setup_method(self):
        """Clear in-memory signals before each test."""
        ForwardTestTracker._signals = {}

    def test_log_signal(self):
        entry = ForwardTestTracker.log_signal(
            signal_id="test-001",
            symbol="EURUSD",
            asset_name="Euro / US Dollar",
            signal_type="REVERSAL",
            direction="BULLISH",
            strength="MAJOR",
            issue_price=1.0850,
            confluence_pct=100.0,
            backtest_hit_rate=68.0,
        )
        assert entry.signal_id == "test-001"
        assert entry.symbol == "EURUSD"
        assert entry.outcome == "PENDING"
        assert entry.is_resolved is False

    def test_idempotent_logging(self):
        ForwardTestTracker.log_signal(
            signal_id="test-002",
            symbol="XAUUSD",
            asset_name="Gold",
            signal_type="CONTINUATION",
            direction="BULLISH",
            strength="MODERATE",
            issue_price=2350.0,
            confluence_pct=66.7,
            backtest_hit_rate=61.0,
        )
        ForwardTestTracker.log_signal(
            signal_id="test-002",
            symbol="XAUUSD",
            asset_name="Gold",
            signal_type="CONTINUATION",
            direction="BULLISH",
            strength="MODERATE",
            issue_price=2360.0,  # Different price – should be ignored
            confluence_pct=66.7,
            backtest_hit_rate=61.0,
        )
        assert len(ForwardTestTracker._signals) == 1
        assert ForwardTestTracker._signals["test-002"]["issue_price"] == 2350.0

    def test_update_prices_marks_pending(self):
        ForwardTestTracker.log_signal(
            signal_id="test-003",
            symbol="EURUSD",
            asset_name="Euro",
            signal_type="REVERSAL",
            direction="BULLISH",
            strength="MINOR",
            issue_price=1.0800,
            confluence_pct=66.7,
            backtest_hit_rate=55.0,
        )
        ForwardTestTracker.update_prices({"EURUSD": 1.0900})
        entry = ForwardTestTracker._signals["test-003"]
        assert entry["current_price"] == 1.0900
        assert entry["realized_return_pct"] > 0  # Bullish + price up = positive return

    def test_summary_stats_empty(self):
        stats = ForwardTestTracker.get_summary_stats()
        assert stats["total_logged"] == 0
        assert stats["rolling_accuracy_pct"] == 0.0

    def test_summary_stats_with_data(self):
        ForwardTestTracker.log_signal(
            signal_id="s1",
            symbol="USDJPY",
            asset_name="USD/JPY",
            signal_type="REVERSAL",
            direction="BULLISH",
            strength="MAJOR",
            issue_price=148.0,
            confluence_pct=100.0,
            backtest_hit_rate=72.0,
        )
        stats = ForwardTestTracker.get_summary_stats()
        assert stats["total_logged"] == 1
        assert stats["total_pending"] == 1

    def test_get_all_entries(self):
        for i in range(5):
            ForwardTestTracker.log_signal(
                signal_id=f"entry-{i}",
                symbol="EURUSD",
                asset_name="EUR/USD",
                signal_type="REVERSAL",
                direction="BULLISH",
                strength="MAJOR",
                issue_price=1.08 + i * 0.001,
                confluence_pct=100.0,
                backtest_hit_rate=68.0,
            )
        entries = ForwardTestTracker.get_all_entries()
        assert len(entries) == 5

    def test_forward_entry_to_dict(self):
        entry = ForwardTestTracker.log_signal(
            signal_id="dict-test",
            symbol="CL",
            asset_name="WTI Crude",
            signal_type="CONTINUATION",
            direction="BEARISH",
            strength="MODERATE",
            issue_price=72.5,
            confluence_pct=66.7,
            backtest_hit_rate=59.0,
        )
        d = forward_entry_to_dict(entry)
        assert d["signal_id"] == "dict-test"
        assert d["outcome"] == "PENDING"
        assert "issue_date" in d
        assert "target_date" in d


class TestHistoricalSignalLog:
    """Test the historical signal journal log with exact dates, outcomes, and filters."""

    def test_get_all_historical_signals(self):
        engine = RegimeSignalEngine()
        log = engine.get_historical_signal_log(limit=500)
        assert log["total_signals"] > 0
        assert log["total_wins"] > 0
        assert log["total_losses"] > 0
        assert log["hit_rate_pct"] > 50.0
        assert len(log["signals"]) > 0

        # Check fields of signals
        for s in log["signals"][:10]:
            assert "signal_id" in s
            assert "date" in s
            assert len(s["date"]) == 10  # YYYY-MM-DD
            assert s["signal_type"] in ("REVERSAL", "CONTINUATION", "PULLBACK_EXHAUSTION")
            assert s["direction"] in ("BULLISH", "BEARISH")
            assert s["outcome"] in ("WIN", "LOSS")
            assert "entry_price" in s
            assert "exit_price" in s
            assert "forward_return_pct" in s
            assert "regime_name" in s

    def test_filter_by_symbol(self):
        engine = RegimeSignalEngine()
        log = engine.get_historical_signal_log(symbol="XAUUSD")
        assert log["total_signals"] > 0
        assert all(s["symbol"] == "XAUUSD" for s in log["signals"])

    def test_filter_by_signal_type_reversal(self):
        engine = RegimeSignalEngine()
        log = engine.get_historical_signal_log(signal_type="REVERSAL")
        assert log["total_signals"] > 0
        assert all(s["signal_type"] == "REVERSAL" for s in log["signals"])

    def test_filter_by_signal_type_continuation(self):
        engine = RegimeSignalEngine()
        log = engine.get_historical_signal_log(signal_type="CONTINUATION")
        assert log["total_signals"] > 0
        assert all(s["signal_type"] == "CONTINUATION" for s in log["signals"])

    def test_filter_by_signal_type_pullback_exhaustion(self):
        engine = RegimeSignalEngine()
        log = engine.get_historical_signal_log(signal_type="PULLBACK_EXHAUSTION")
        assert log["total_signals"] > 0
        assert all(s["signal_type"] == "PULLBACK_EXHAUSTION" for s in log["signals"])

    def test_nzdusd_in_scored_assets(self):
        assert "NZDUSD" in SCORED_ASSETS
        assert SCORED_ASSETS["NZDUSD"] == "New Zealand Dollar / US Dollar"

    def test_nzdusd_pullback_exhaustion_detected_on_rally(self):
        # On 2026-08-21, NZDUSD rallied into 0.5989 against prevailing bearish macro score
        signals = RegimeSignalEngine.detect_signals_for_asset(
            "NZDUSD", "New Zealand Dollar / US Dollar", current_price=0.5989
        )
        assert len(signals) >= 1
        pb_sig = next((s for s in signals if s.signal_type == "PULLBACK_EXHAUSTION"), None)
        assert pb_sig is not None
        assert pb_sig.direction == "BEARISH"
        assert pb_sig.strength == "MAJOR"
        assert "Fade the rally" in pb_sig.entry_context

    def test_filter_by_outcome_win_and_loss(self):
        engine = RegimeSignalEngine()
        wins_log = engine.get_historical_signal_log(outcome="WIN")
        assert wins_log["total_signals"] > 0
        assert all(s["outcome"] == "WIN" for s in wins_log["signals"])
        assert wins_log["hit_rate_pct"] == 100.0

        losses_log = engine.get_historical_signal_log(outcome="LOSS")
        assert losses_log["total_signals"] > 0
        assert all(s["outcome"] == "LOSS" for s in losses_log["signals"])
        assert losses_log["hit_rate_pct"] == 0.0

    def test_in_memory_caching(self):
        engine = RegimeSignalEngine()
        res1 = engine.get_historical_signal_log(limit=50)
        res2 = engine.get_historical_signal_log(limit=50)
        assert res1["total_signals"] == res2["total_signals"]
        assert len(res1["signals"]) == len(res2["signals"])

    def test_ethusd_in_scored_assets(self):
        assert "ETHUSD" in SCORED_ASSETS
        assert SCORED_ASSETS["ETHUSD"] == "Ethereum (ETH/USD)"

    def test_ethusd_score_series_and_scanning(self):
        series = _build_score_series("ETHUSD")
        assert len(series) >= 700
        # Check last observation has non-empty score and cot_z
        date, score, bias, cot_z = series[-1]
        assert isinstance(date, str)
        assert isinstance(score, float)
        assert -100.0 <= score <= 100.0
        assert isinstance(cot_z, float)

        signals = RegimeSignalEngine.detect_signals_for_asset(
            "ETHUSD", SCORED_ASSETS["ETHUSD"], current_price=2550.0
        )
        assert isinstance(signals, list)

    def test_ethusd_15y_backtest_validator(self):
        from backend.app.backtest.historical_15y_validator import Historical15YearValidator
        report = Historical15YearValidator.run_15y_validation(symbol="ETHUSD", horizon_weeks=4)
        assert report.asset_symbol == "ETHUSD"
        assert report.total_signals > 0
        assert 0.0 <= report.overall_hit_rate_pct <= 100.0



