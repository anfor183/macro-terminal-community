"""Currency Relative-Value Model and Strength Matrix Engine."""

from typing import Dict, List, Any


def calculate_currency_strength_matrix(
    currencies: List[Dict[str, Any]],
) -> List[Dict[str, Any]]:
    """Compute the cross-comparison matrix and relative strength for all currencies.
    
    Each currency has:
    - Absolute score
    - Relative score vs every other currency
    - Fundamental rank (1 = Strongest, N = Weakest)
    """
    sorted_currs = sorted(currencies, key=lambda c: c["current_score"], reverse=True)
    matrix = []

    for rank, curr in enumerate(sorted_currs, 1):
        code = curr["code"]
        rel_scores = {}
        for other in currencies:
            other_code = other["code"]
            if code == other_code:
                rel_scores[other_code] = 0.0
            else:
                # Base minus Quote
                rel = round(curr["current_score"] - other["current_score"], 1)
                rel_scores[other_code] = rel

        matrix.append({
            "currency": code,
            "name": curr.get("name", code),
            "absolute_score": curr["current_score"],
            "weekly_score": curr.get("weekly_score", curr["current_score"] - 2.0),
            "rank": rank,
            "policy_stance": curr.get("policy_direction", "Neutral"),
            "growth_stance": curr.get("growth_direction", "Stable"),
            "relative_scores": rel_scores,
            "asset_class": curr.get("asset_class", "currency"),
        })

    return matrix


def calculate_forex_pair_score(
    base_currency_score: float,
    quote_currency_score: float,
    yield_differential_score: float = 0.0,
    terms_of_trade_adjustment: float = 0.0,
) -> float:
    """Calculate relative score for a currency pair (e.g., EURUSD).
    
    EURUSD = EUR score - USD score + yield spread contribution + trade adjustment.
    Clamped strictly between -100.0 and +100.0.
    """
    raw_relative = base_currency_score - quote_currency_score
    total = raw_relative + (yield_differential_score * 0.15) + terms_of_trade_adjustment
    return max(-100.0, min(100.0, round(total, 1)))


def rank_forex_pairs(
    pairs: List[Dict[str, Any]],
) -> List[Dict[str, Any]]:
    """Rank forex pairs by fundamental conviction:
    Conviction = |Tactical Score| * (Confidence / 100).
    """
    ranked = []
    for p in pairs:
        score = p.get("tactical_score", 0.0)
        conf = p.get("confidence", 75.0)
        conviction = round(abs(score) * (conf / 100.0), 2)
        ranked.append({
            **p,
            "conviction_score": conviction,
        })

    ranked.sort(key=lambda x: x["conviction_score"], reverse=True)
    for idx, item in enumerate(ranked, 1):
        item["rank"] = idx

    return ranked
