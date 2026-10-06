"""Macro Regime Detection Engine."""

from datetime import datetime, timezone
from typing import Dict, Any, List


def detect_macro_regime(
    global_growth_score: float = 15.0,
    inflation_momentum: float = -12.0, # Negative means cooling inflation
    liquidity_score: float = 25.0,     # Positive means central bank easing / liquidity injection
    vix_volatility_score: float = 16.5, # Under 20 is calm / risk-on
) -> Dict[str, Any]:
    """Detect overlapping macro regimes: Growth, Inflation, Liquidity, and Risk Sentiment."""
    active_regimes = []

    # Risk sentiment
    if vix_volatility_score > 25.0 or global_growth_score < -20.0:
        risk_sentiment = "RISK_OFF"
        active_regimes.append("RISK_OFF")
    elif vix_volatility_score < 18.0 and global_growth_score >= 0.0:
        risk_sentiment = "RISK_ON"
        active_regimes.append("RISK_ON")
    else:
        risk_sentiment = "NEUTRAL"

    # Inflation cycle
    if inflation_momentum < -5.0 and global_growth_score >= 0.0:
        inflation_cycle = "DISINFLATIONARY"
        active_regimes.append("DISINFLATIONARY_GROWTH")
    elif inflation_momentum > 10.0 and global_growth_score < 0.0:
        inflation_cycle = "STAGFLATIONARY"
        active_regimes.append("STAGFLATION_RISK")
    elif inflation_momentum > 5.0:
        inflation_cycle = "INFLATIONARY"
        active_regimes.append("INFLATIONARY_EXPANSION")
    else:
        inflation_cycle = "MODERATE_INFLATION"

    # Growth cycle
    if global_growth_score > 25.0:
        growth_cycle = "EXPANSION"
        active_regimes.append("GROWTH_EXPANSION")
    elif global_growth_score >= 0.0:
        growth_cycle = "SLOWDOWN"
        active_regimes.append("GROWTH_SLOWDOWN")
    else:
        growth_cycle = "CONTRACTION"
        active_regimes.append("GROWTH_CONTRACTION")

    # Liquidity cycle
    if liquidity_score > 10.0:
        liquidity_cycle = "EXPANDING"
        active_regimes.append("LIQUIDITY_EXPANSION")
    elif liquidity_score < -10.0:
        liquidity_cycle = "CONTRACTING"
        active_regimes.append("LIQUIDITY_TIGHTENING")
    else:
        liquidity_cycle = "NEUTRAL"

    primary_regime = f"{risk_sentiment} | {inflation_cycle} {growth_cycle}".title()

    summary = (
        f"Global macro environment is operating in a {inflation_cycle.lower()} {growth_cycle.lower()} regime. "
        f"Liquidity is {liquidity_cycle.lower()} while broader risk sentiment remains {risk_sentiment.lower().replace('_', '-')}. "
        "Favors high-quality assets, precious metals, and currencies with solid external balances."
    )

    return {
        "primary_regime": primary_regime,
        "active_regimes": active_regimes,
        "risk_sentiment": risk_sentiment,
        "liquidity_cycle": liquidity_cycle,
        "growth_cycle": growth_cycle,
        "inflation_cycle": inflation_cycle,
        "summary": summary,
        "key_drivers": [
            f"Global growth momentum tracking at {global_growth_score:+.1f}",
            f"Inflation momentum annualized at {inflation_momentum:+.1f}",
            f"Central bank liquidity impulse scored at {liquidity_score:+.1f}",
            f"CBOE VIX volatility tracking at {vix_volatility_score:.1f} ({'Subdued / Risk-Seeking' if vix_volatility_score < 18.0 else 'Elevated Caution' if vix_volatility_score < 25.0 else 'High Fear'})"],
        "timestamp": datetime.now(timezone.utc),
    }
