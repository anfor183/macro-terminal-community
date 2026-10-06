"""Unit tests for CFTC COT Positioning Engine, High-Conviction Confluence Scorer, and Enhanced Backtest."""

import pytest
from backend.app.engine.cot_engine import COTEngine, cot_snapshot_to_dict
from backend.app.ingestion.live_cot_data import LiveCOTManager
from backend.app.scoring.high_conviction_scorer import HighConvictionScorer, confluence_card_to_dict
from backend.app.backtest.historical_15y_validator import Historical15YearValidator, report_15y_to_dict


class TestCOTEngine:
    """Validate COT positioning metrics, crowding indices, and squeeze warnings."""

    def test_crowding_index_bounds(self):
        for z in [-3.5, -2.0, -1.0, 0.0, 1.0, 2.0, 3.5]:
            idx = COTEngine.calculate_crowding_index(z)
            assert 0.0 <= idx <= 100.0, f"Crowding index {idx} out of bounds for Z={z}"

    def test_neutral_crowding_at_zero_zscore(self):
        idx = COTEngine.calculate_crowding_index(0.0)
        assert 48.0 <= idx <= 52.0, f"Expected neutral ~50.0, got {idx}"

    def test_short_squeeze_risk_detection(self):
        # Bearish macro + extreme crowded shorts (crowding < 18) -> Squeeze warning
        squeeze = COTEngine.detect_squeeze_risk(crowding_index=12.0, macro_score=-35.0)
        assert squeeze is not None
        assert "SHORT_SQUEEZE_RISK" in squeeze

    def test_long_liquidation_risk_detection(self):
        # Bullish macro + extreme crowded longs (crowding > 82) -> Long liquidation warning
        squeeze = COTEngine.detect_squeeze_risk(crowding_index=88.0, macro_score=45.0)
        assert squeeze is not None
        assert "LONG_LIQUIDATION_RISK" in squeeze

    def test_no_squeeze_when_positioning_healthy(self):
        # Balanced positioning -> No warning
        squeeze = COTEngine.detect_squeeze_risk(crowding_index=45.0, macro_score=-35.0)
        assert squeeze is None

    def test_live_cot_manager_returns_major_assets(self):
        symbols = ["EURUSD", "USDJPY", "GBPUSD", "SPX", "XAUUSD", "CL", "BTCUSD", "ETHUSD", "NDX", "XAGUSD"]
        for sym in symbols:
            snap = LiveCOTManager.get_latest_cot(sym)
            assert snap.symbol == sym
            assert snap.total_open_interest > 0
            assert 0.0 <= snap.crowding_index <= 100.0
            assert -4.0 <= snap.cot_zscore_3y <= 4.0

    def test_all_cot_retrieval(self):
        all_cot = LiveCOTManager.get_all_latest_cot()
        assert len(all_cot) >= 6
        symbols = {s.symbol for s in all_cot}
        assert "EURUSD" in symbols
        assert "XAUUSD" in symbols
        assert "BTCUSD" in symbols


class TestHighConvictionScorer:
    """Validate multi-factor confluence scoring and actionable technical directives."""

    def test_confluence_card_generation(self):
        snap = LiveCOTManager.get_latest_cot("EURUSD")
        card = HighConvictionScorer.compute_confluence_card(
            symbol="EURUSD",
            asset_name="Euro / US Dollar",
            current_price=1.1050,
            daily_atr=0.0065,
            macro_score=50.0,
            cot_snapshot=snap,
            policy_spread_score=35.0,
            growth_inflation_score=20.0,
        )
        assert card.symbol == "EURUSD"
        assert card.high_conviction_score > 0
        assert card.high_conviction_bias in ("BULLISH", "STRONG BULLISH", "MILD BULLISH", "NEUTRAL")
        assert len(card.pillars) == 4
        assert len(card.checklist) >= 3

    def test_bearish_invalidation_level_above_price(self):
        snap = LiveCOTManager.get_latest_cot("EURUSD")
        curr_price = 1.0850
        atr = 0.0070
        card = HighConvictionScorer.compute_confluence_card(
            symbol="EURUSD",
            asset_name="Euro / US Dollar",
            current_price=curr_price,
            daily_atr=atr,
            macro_score=-55.0,
            cot_snapshot=snap,
            policy_spread_score=-40.0,
            growth_inflation_score=-30.0,
        )
        assert "BEARISH" in card.primary_direction or card.primary_direction == "FAVOR SHORTS ONLY"
        assert card.invalidation_price_level > curr_price, "Bearish invalidation must be above market price"

    def test_bullish_invalidation_level_below_price(self):
        snap = LiveCOTManager.get_latest_cot("XAUUSD")
        curr_price = 2500.0
        atr = 25.0
        card = HighConvictionScorer.compute_confluence_card(
            symbol="XAUUSD",
            asset_name="Gold Commodity Futures",
            current_price=curr_price,
            daily_atr=atr,
            macro_score=60.0,
            cot_snapshot=snap,
            policy_spread_score=40.0,
            growth_inflation_score=35.0,
        )
        assert card.primary_direction == "FAVOR LONGS ONLY"
        assert card.invalidation_price_level < curr_price, "Bullish invalidation must be below market price"


    def test_confluence_dict_serialization(self):
        snap = LiveCOTManager.get_latest_cot("GBPUSD")
        card = HighConvictionScorer.compute_confluence_card(
            symbol="GBPUSD",
            asset_name="British Pound",
            current_price=1.3120,
            daily_atr=0.0080,
            macro_score=25.0,
            cot_snapshot=snap,
        )
        d = confluence_card_to_dict(card)
        assert d["symbol"] == "GBPUSD"
        assert "pillars" in d
        assert "checklist" in d
        assert "invalidation_price_level" in d


class TestEnhancedBacktestIntegration:
    """Validate 15-year backtest enhanced metrics."""

    def test_enhanced_fields_in_report(self):
        rep = Historical15YearValidator.run_15y_validation("EURUSD", horizon_weeks=4)
        d = report_15y_to_dict(rep)
        assert "enhanced_hit_rate_pct" in d
        assert "enhanced_sharpe_equivalent" in d
        assert "enhanced_max_drawdown_pct" in d
        assert "enhanced_cumulative_return_pct" in d
        assert "enhanced_signals_count" in d

    def test_enhanced_equity_curve_points(self):
        rep = Historical15YearValidator.run_15y_validation("EURUSD", horizon_weeks=4)
        eq = rep.equity_curve
        assert len(eq) > 0
        first_pt = eq[0]
        assert "strategy_equity" in first_pt
        assert "enhanced_equity" in first_pt
        assert "buy_hold_equity" in first_pt
