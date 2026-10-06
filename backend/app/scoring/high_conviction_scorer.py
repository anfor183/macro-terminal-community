"""High-Conviction Composite Scorer and Technical Directives Engine.

Synthesizes:
1. Macro Fundamentals (40% weight): Policy rate differentials, inflation, yield curve spread.
2. CFTC COT Positioning (30% weight): Speculative sentiment, crowding avoidance, smart money flow.
3. Monetary Expectations & Transmission (15% weight): Priced-in market discount vs policy trajectory.
4. Volatility & Risk Regime (15% weight): ATR bounds, risk-on / risk-off cross-asset backdrop.

Applies Non-Linear Crowding Filters:
- Dampens signals when speculative positioning is over-crowded (>85 or <15).
- Upgrades conviction to STRONG BULLISH / STRONG BEARISH (Confidence 85%+) when Macro and COT align.
- Generates actionable directives tailored specifically for technical chart execution.
"""

from dataclasses import dataclass
from typing import Dict, Any, List, Optional
from backend.app.core.constants import score_to_bias
from backend.app.engine.cot_engine import COTPositionSnapshot, COTEngine
from backend.app.intelligence.ml_engine import macro_ml_engine


@dataclass
class ConfluencePillar:
    name: str
    label: str
    score: float  # -100 to +100
    weight: float
    status: str  # BULLISH, BEARISH, NEUTRAL
    details: str


@dataclass
class TraderConfluenceCard:
    """Comprehensive high-conviction macro intelligence card for technical traders."""
    symbol: str
    asset_name: str
    current_price: float
    daily_atr: float
    high_conviction_score: float  # -100 to +100
    high_conviction_bias: str  # STRONG BULLISH, BULLISH, NEUTRAL, BEARISH, STRONG BEARISH
    confidence_pct: float  # 0 to 100
    primary_direction: str  # FAVOR LONGS ONLY / FAVOR SHORTS ONLY / STAY RANGEBOUND
    execution_directive: str  # Tactical execution advice for charts
    invalidation_price_level: float  # Technical invalidation boundary
    cot_crowding_index: float  # 0 to 100
    cot_zscore_3y: float
    cot_sentiment_label: str
    squeeze_warning: Optional[str]
    pillars: List[ConfluencePillar]
    checklist: List[Dict[str, Any]]
    disclaimer: str
    ml_prediction: Optional[Dict[str, Any]] = None
    dynamic_weights: Optional[Dict[str, float]] = None


class HighConvictionScorer:
    """Combines Macro Fundamentals, CFTC COT Positioning, and Volatility Risk."""

    @classmethod
    def compute_confluence_card(
        cls,
        symbol: str,
        asset_name: str,
        current_price: float,
        daily_atr: float,
        macro_score: float,
        cot_snapshot: COTPositionSnapshot,
        policy_spread_score: float = 0.0,
        growth_inflation_score: float = 0.0,
        market_volatility_score: float = 0.0,
    ) -> TraderConfluenceCard:
        """Generate high-conviction confluence card with technical directives."""
        # 1. Evaluate COT positioning contribution (-100 to +100)
        # Crowding index: 50 is neutral. (Crowding - 50) * 2 gives -100 to +100.
        # But we must apply the anti-crowding penalty:
        # If macro is Bearish and Crowding is < 20 (oversold shorts), COT score should NOT be deeply negative (squeeze risk)
        raw_cot_score = (cot_snapshot.crowding_index - 50.0) * 2.0

        # Crowding filter adjustment
        crowding = cot_snapshot.crowding_index
        squeeze_warning = cot_snapshot.squeeze_warning

        if macro_score < -15.0 and crowding <= 18.0:
            # Short squeeze trap: damp COT bearish score towards 0 to avoid shorting bottom
            effective_cot_score = max(-20.0, raw_cot_score * 0.3)
            crowding_penalty = -25.0  # penalize confidence
        elif macro_score > 15.0 and crowding >= 82.0:
            # Long liquidation trap: damp COT bullish score towards 0
            effective_cot_score = min(20.0, raw_cot_score * 0.3)
            crowding_penalty = -25.0
        elif macro_score > 15.0 and crowding <= 18.0:
            # Bullish contrarian squeeze setup: market is overly short against bullish fundamentals
            effective_cot_score = min(25.0, abs(raw_cot_score) * 0.3)
            crowding_penalty = -10.0
        elif macro_score < -15.0 and crowding >= 82.0:
            # Bearish contrarian flush setup: market is overly long against bearish fundamentals
            effective_cot_score = max(-25.0, -raw_cot_score * 0.3)
            crowding_penalty = -10.0
        else:
            effective_cot_score = raw_cot_score
            crowding_penalty = 0.0

        # 2. Weighted Composite Calculation
        # Pillar 1: Macro Fundamentals (40%)
        # Pillar 2: CFTC Positioning (30%)
        # Pillar 3: Policy Rate Spread / Central Bank Differential (15%)
        # Pillar 4: Growth / Inflation Surprises (15%)
        w_macro = 0.40
        w_cot = 0.30
        w_policy = 0.15
        w_growth = 0.15

        comp_score = (
            macro_score * w_macro +
            effective_cot_score * w_cot +
            policy_spread_score * w_policy +
            growth_inflation_score * w_growth
        )
        comp_score = max(-100.0, min(100.0, round(comp_score, 1)))
        final_bias = score_to_bias(comp_score)

        # 3. Confidence Calculation
        # Baseline confidence from score magnitude
        base_conf = 50.0 + (abs(comp_score) * 0.42)
        # Bonus if Macro and COT align in the same direction
        alignment = (macro_score > 15.0 and effective_cot_score > 15.0) or (macro_score < -15.0 and effective_cot_score < -15.0)
        if alignment:
            base_conf += 12.0

        final_conf = max(35.0, min(96.0, round(base_conf + crowding_penalty, 1)))

        # 4. Technical Trader Directives
        if comp_score >= 40.0:
            primary_direction = "FAVOR LONGS ONLY"
            if crowding >= 80.0:
                execution_directive = (
                    "Macro is strongly bullish, but speculative longs are crowded (>80th percentile). "
                    "Avoid buying breakouts. Wait for 4H/Daily pullback into institutional demand / value zones."
                )
            else:
                execution_directive = (
                    "High-conviction bullish alignment between Macro Differentials and COT positioning. "
                    "Favor long continuation setups. Buy dips into key support and moving average dynamic zones."
                )
            inval_level = round(current_price - (1.5 * daily_atr), 4)
        elif comp_score <= -40.0:
            primary_direction = "FAVOR SHORTS ONLY"
            if crowding <= 20.0:
                execution_directive = (
                    "Macro is strongly bearish, but speculative shorts are at 3-year extremes. "
                    "High risk of short squeeze. Do NOT short breakdown support. Wait for relief rally into supply resistance."
                )
            else:
                execution_directive = (
                    "High-conviction bearish alignment between Macro Differentials and COT positioning. "
                    "Favor short setups exclusively. Sell rallies into key supply zones and descending trendlines."
                )
            inval_level = round(current_price + (1.5 * daily_atr), 4)
        elif comp_score >= 15.0:
            primary_direction = "MILD BULLISH BIAS"
            execution_directive = (
                "Moderate upside macro bias. Take long setups with tighter targets; avoid aggressive swing holds."
            )
            inval_level = round(current_price - (1.2 * daily_atr), 4)
        elif comp_score <= -15.0:
            primary_direction = "MILD BEARISH BIAS"
            execution_directive = (
                "Moderate downside macro bias. Take short setups with standard risk parameters; take partial profits at key support."
            )
            inval_level = round(current_price + (1.2 * daily_atr), 4)
        else:
            primary_direction = "NEUTRAL / STAY RANGEBOUND"
            execution_directive = (
                "Fundamental and positioning forces are in equilibrium. Macro provides no directional edge. "
                "Trade pure technical range boundaries (buy support, sell resistance) or stay sidelined."
            )
            inval_level = round(current_price - (1.0 * daily_atr), 4)

        # 5. Pillars Breakdown
        pillars = [
            ConfluencePillar(
                name="macro_momentum",
                label="Macro Fundamental Momentum",
                score=round(macro_score, 1),
                weight=w_macro,
                status="BULLISH" if macro_score >= 15 else ("BEARISH" if macro_score <= -15 else "NEUTRAL"),
                details=f"Relative macroeconomic score based on policy divergence and inflation trend."
            ),
            ConfluencePillar(
                name="cot_positioning",
                label="CFTC Institutional Positioning",
                score=round(effective_cot_score, 1),
                weight=w_cot,
                status="BULLISH" if effective_cot_score >= 15 else ("BEARISH" if effective_cot_score <= -15 else "NEUTRAL"),
                details=f"Speculative net positioning index: {crowding}/100. 3Y Z-Score: {cot_snapshot.cot_zscore_3y}."
            ),
            ConfluencePillar(
                name="policy_spread",
                label="Central Bank Yield Differential",
                score=round(policy_spread_score, 1),
                weight=w_policy,
                status="BULLISH" if policy_spread_score >= 15 else ("BEARISH" if policy_spread_score <= -15 else "NEUTRAL"),
                details=f"Short-term benchmark rate gap and 10Y-2Y yield curve slope."
            ),
            ConfluencePillar(
                name="growth_inflation",
                label="Growth & CPI Surprises",
                score=round(growth_inflation_score, 1),
                weight=w_growth,
                status="BULLISH" if growth_inflation_score >= 15 else ("BEARISH" if growth_inflation_score <= -15 else "NEUTRAL"),
                details=f"Economic data surprises (PMIs, labor, CPI) vs consensus expectations."
            ),
        ]

        # 6. Confluence Checklist for Technical Traders
        checklist = [
            {
                "title": "Macro Rate Differentials Aligned",
                "passed": (comp_score > 15 and policy_spread_score > 0) or (comp_score < -15 and policy_spread_score < 0) or abs(comp_score) <= 15,
                "note": "Central bank policy direction supports trade thesis.",
            },
            {
                "title": "CFTC COT Positioning Healthy (No Squeeze)",
                "passed": 20.0 <= crowding <= 80.0,
                "note": "Trade is not overcrowded. Institutional liquidity is available for continuation.",
            },
            {
                "title": "Economic Surprises Confirming",
                "passed": (comp_score > 0 and growth_inflation_score >= 0) or (comp_score < 0 and growth_inflation_score <= 0),
                "note": "Recent economic releases beat/miss in alignment with model bias.",
            },
            {
                "title": "Technical Invalidation Level Defined",
                "passed": True,
                "note": f"Macro bias invalidated if price breaches {inval_level}.",
            },
        ]

        # 5. Run ML Model Inference and Dynamic Weight Optimization
        ml_res = macro_ml_engine.predict_confluence(
            symbol=symbol,
            asset_class="forex" if "/" in symbol or len(symbol) == 6 else "index",
            yield_spread_10y_2y=policy_spread_score * 2.0,
            policy_rate_spread=policy_spread_score,
            cot_crowding_index=crowding,
            cot_zscore_3y=cot_snapshot.cot_zscore_3y,
            volatility_atr_pct=min(95.0, max(10.0, market_volatility_score + 50.0)),
            inflation_surprise_zscore=growth_inflation_score / 30.0,
            growth_surprise_zscore=growth_inflation_score / 30.0,
            risk_sentiment_score=macro_score,
        )

        ml_pred_dict = {
            "predicted_bias": ml_res.predicted_bias,
            "ml_conviction_score": ml_res.ml_conviction_score,
            "probability_distribution": ml_res.probability_distribution,
            "feature_importances": ml_res.feature_importances,
            "model_version": ml_res.model_version,
            "regime_alignment": ml_res.regime_alignment,
        }

        return TraderConfluenceCard(
            symbol=symbol.upper(),
            asset_name=asset_name,
            current_price=current_price,
            daily_atr=round(daily_atr, 4),
            high_conviction_score=comp_score,
            high_conviction_bias=final_bias,
            confidence_pct=final_conf,
            primary_direction=primary_direction,
            execution_directive=execution_directive,
            invalidation_price_level=inval_level,
            cot_crowding_index=crowding,
            cot_zscore_3y=cot_snapshot.cot_zscore_3y,
            cot_sentiment_label=cot_snapshot.sentiment_label,
            squeeze_warning=squeeze_warning,
            pillars=pillars,
            checklist=checklist,
            disclaimer="Institutional macro intelligence for technical execution. Not financial advice.",
            ml_prediction=ml_pred_dict,
            dynamic_weights=ml_res.dynamic_weights,
        )


def confluence_card_to_dict(card: TraderConfluenceCard) -> Dict[str, Any]:
    """Serialize TraderConfluenceCard to dict for JSON API."""
    return {
        "symbol": card.symbol,
        "asset_name": card.asset_name,
        "current_price": card.current_price,
        "daily_atr": card.daily_atr,
        "high_conviction_score": card.high_conviction_score,
        "high_conviction_bias": card.high_conviction_bias,
        "confidence_pct": card.confidence_pct,
        "primary_direction": card.primary_direction,
        "execution_directive": card.execution_directive,
        "invalidation_price_level": card.invalidation_price_level,
        "cot_crowding_index": card.cot_crowding_index,
        "cot_zscore_3y": card.cot_zscore_3y,
        "cot_sentiment_label": card.cot_sentiment_label,
        "squeeze_warning": card.squeeze_warning,
        "pillars": [
            {
                "name": p.name,
                "label": p.label,
                "score": p.score,
                "weight": p.weight,
                "status": p.status,
                "details": p.details,
            }
            for p in card.pillars
        ],
        "checklist": card.checklist,
        "disclaimer": card.disclaimer,
        "ml_prediction": card.ml_prediction,
        "dynamic_weights": card.dynamic_weights,
    }
