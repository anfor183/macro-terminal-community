"""Comprehensive unit and integration tests for AI, ML, NLP, and RAG services."""

import pytest
from backend.app.intelligence.nlp_sentiment import MacroNLPSentiment
from backend.app.intelligence.rag_service import MacroRAGService, rag_service
from backend.app.intelligence.ml_engine import MacroMLEngine, macro_ml_engine
from backend.app.intelligence.ai_service import MacroAIService
from backend.app.scoring.high_conviction_scorer import HighConvictionScorer
from backend.app.engine.cot_engine import COTPositionSnapshot


def test_nlp_sentiment_hawkish_detection():
    text = "Fed Chair Powell strongly signals another rate hike to counter persistent inflation pressures."
    res = MacroNLPSentiment.analyze_text(text)
    assert res.hawkish_dovish_score > 20.0
    assert res.direction == "BULLISH"
    assert "USD" in res.detected_currencies
    assert res.statement_type == "CENTRAL_BANK_GUIDANCE"


def test_nlp_sentiment_dovish_with_negation():
    # Negated hawkish phrase should not score positive
    text = "The central bank rejected further rate hikes and announced that easing policy is now appropriate."
    res = MacroNLPSentiment.analyze_text(text)
    assert res.hawkish_dovish_score < 0.0
    assert res.direction in ("BEARISH", "NEUTRAL")


def test_nlp_sentiment_hard_data_classification():
    text = "Labor Department reported nonfarm payrolls rose to 254,000, beating consensus as unemployment rate printed at 4.1%."
    res = MacroNLPSentiment.analyze_text(text)
    assert res.statement_type == "HARD_DATA"
    assert res.confidence >= 80.0
    assert res.growth_sentiment > 0.0


def test_rag_semantic_search():
    service = MacroRAGService()
    results = service.search("What happens when the Bank of Japan ends negative rates and carry trades unwind?", top_k=3)
    assert len(results) > 0
    top = results[0].document
    assert "BOJ" in top.institution or "GLOBAL_MACRO" in top.institution or "Carry Trade" in top.title
    assert results[0].relevance_score > 0.10


def test_rag_grounded_context_builder():
    context = rag_service.build_grounded_context("Federal Reserve 50bp rate cut", top_k=2)
    assert "FOMC" in context or "Federal Reserve" in context
    assert "Takeaway:" in context


def test_ml_engine_dynamic_weights():
    engine = MacroMLEngine()
    # In an inflationary regime, monetary_policy and inflation should receive higher weights
    weights_inf = engine.optimize_factor_weights("forex", current_regime="INFLATIONARY_SHOCK")
    weights_norm = engine.optimize_factor_weights("forex", current_regime="GROWTH_EXPANSION")

    assert weights_inf["monetary_policy"] > weights_norm["monetary_policy"]
    assert weights_inf["inflation"] > weights_norm["inflation"]
    # Verify weights strictly sum to 1.0
    assert abs(sum(weights_inf.values()) - 1.0) < 0.01


def test_ml_engine_confluence_prediction():
    res = macro_ml_engine.predict_confluence(
        symbol="EURUSD",
        asset_class="forex",
        yield_spread_10y_2y=-60.0,
        policy_rate_spread=-150.0,
        cot_crowding_index=25.0,
        cot_zscore_3y=-1.5,
        volatility_atr_pct=45.0,
        inflation_surprise_zscore=-0.8,
        growth_surprise_zscore=-1.2,
        risk_sentiment_score=-20.0,
        macro_regime="SLOWDOWN"
    )
    assert res.predicted_bias in ("BEARISH", "STRONG BEARISH", "NEUTRAL")
    assert 0.0 <= res.ml_conviction_score <= 100.0
    assert len(res.feature_importances) > 0
    assert "BULLISH" in res.probability_distribution


@pytest.mark.asyncio
async def test_macro_ai_service_offline_synthesis():
    # Even without API key, must generate institutional structured narrative
    ai = MacroAIService(api_key="")
    explanation = await ai.generate_explanation(
        symbol="EURUSD",
        asset_class="forex",
        score=-45.0,
        bias="BEARISH",
        confidence=82.0,
        bullish_factors=["Subdued gas prices"],
        bearish_factors=["Widening Fed-ECB rate spread", "German manufacturing contraction"],
        conflicts=[],
        top_driver="ECB Easing vs Fed Higher for Longer"
    )
    assert "EURUSD is currently Bearish" in explanation
    assert "ecb easing vs fed higher for longer" in explanation.lower()
    assert "invalidation" in explanation.lower()


@pytest.mark.asyncio
async def test_macro_ai_copilot_query():
    ai = MacroAIService(api_key="")
    res = await ai.query_macro_copilot("How does a Fed rate pause impact Gold prices?", symbol="XAUUSD")
    assert "response" in res
    assert "citations" in res
    assert "Grounded" in res["provider"] or "Deterministic Grounded Synthesis Engine" in res["provider"]


def test_high_conviction_scorer_includes_ml():
    cot = COTPositionSnapshot(
        symbol="EURUSD",
        asset_name="Euro",
        cftc_contract_code="099741",
        report_date="2026-03-01",
        non_commercial_long=200000,
        non_commercial_short=150000,
        commercial_long=300000,
        commercial_short=350000,
        total_open_interest=650000,
        net_speculative=50000,
        net_commercial=-50000,
        spec_net_pct_oi=7.69,
        cot_zscore_3y=0.2,
        crowding_index=55.0,
        positioning_trend_4w=2500,
        sentiment_label="NEUTRAL",
        squeeze_warning=None,
    )

    card = HighConvictionScorer.compute_confluence_card(
        symbol="EURUSD",
        asset_name="Euro / US Dollar",
        current_price=1.0850,
        daily_atr=0.0065,
        macro_score=25.0,
        cot_snapshot=cot,
        policy_spread_score=15.0,
        growth_inflation_score=10.0,
    )

    assert card.ml_prediction is not None
    assert "predicted_bias" in card.ml_prediction
    assert "ml_conviction_score" in card.ml_prediction
    assert card.dynamic_weights is not None
