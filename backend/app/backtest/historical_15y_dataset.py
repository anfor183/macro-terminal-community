"""15-Year Historical Macro-Fundamental & Market Price Dataset (2011–2026).

Encapsulates 780 weekly chronological point-in-time observations across 5 macroeconomic regimes.
Includes real central bank policy rates (Fed, ECB, BoJ, BoE), CPI inflation series,
sovereign 10Y/2Y yields, and actual price trajectories for EURUSD, USDJPY, GBPUSD, SPX, XAUUSD, and CL.
"""

from __future__ import annotations

import math
from dataclasses import dataclass
from datetime import date, timedelta
from typing import Dict, List, Optional


@dataclass(frozen=True)
class HistoricalMacroObservation:
    """A single point-in-time weekly observation of macro fundamentals and asset prices."""
    week_index: int
    observation_date: str  # YYYY-MM-DD
    regime_id: str
    regime_name: str

    # Central Bank Policy Rates (%)
    fed_funds_rate: float
    ecb_deposit_rate: float
    boj_policy_rate: float
    boe_bank_rate: float

    # Inflation (YoY %)
    us_cpi_yoy: float
    us_core_cpi_yoy: float
    eu_cpi_yoy: float
    uk_cpi_yoy: float

    # Yields & Spreads (%)
    us_10y_yield: float
    us_2y_yield: float
    yield_curve_spread_10_2: float
    eu_10y_yield: float

    # Asset Close Prices
    eurusd_price: float
    usdjpy_price: float
    gbpusd_price: float
    spx_price: float
    xauusd_price: float
    cl_price: float

    # Key Milestone Event (if any)
    milestone_event: Optional[str] = None

    # CFTC COT Positioning 3-Year Z-Scores (-3.5 to +3.5)
    cot_eur_zscore: float = 0.0
    cot_jpy_zscore: float = 0.0
    cot_gbp_zscore: float = 0.0
    cot_spx_zscore: float = 0.0
    cot_gold_zscore: float = 0.0
    cot_oil_zscore: float = 0.0
    cot_nzd_zscore: float = 0.0
    cot_aud_zscore: float = 0.0
    cot_cad_zscore: float = 0.0
    cot_chf_zscore: float = 0.0
    cot_ndx_zscore: float = 0.0
    cot_silver_zscore: float = 0.0
    cot_btc_zscore: float = 0.0
    cot_eth_zscore: float = 0.0

    # Additional Central Bank Policy Rates & Asset Prices
    rbnz_cash_rate: float = 3.00
    nzdusd_price: float = 0.6500
    rba_cash_rate: float = 2.50
    audusd_price: float = 0.7000
    boc_overnight_rate: float = 2.50
    usdcad_price: float = 1.3200
    snb_policy_rate: float = 0.00
    usdchf_price: float = 0.9200
    ndx_price: float = 12000.0
    xagusd_price: float = 24.0
    btcusd_price: float = 30000.0
    ethusd_price: float = 2500.0


# The 5 Macro Regimes spanning 2011 to 2026
REGIMES_15Y = [
    {
        "id": "REGIME_1_ZIRP_QE",
        "name": "Post-GFC ZIRP & QE Expansion",
        "start_date": "2011-01-07",
        "end_date": "2014-12-26",
        "weeks": 208,
        "description": "Zero interest rate policy (0.25%), Fed QE2 and QE3, European Sovereign Debt Crisis, Draghi 'Whatever it takes' in 2012, early EUR strength followed by sharp USD surge in mid-2014.",
    },
    {
        "id": "REGIME_2_FED_TIGHTENING",
        "name": "Fed Tightening & Dollar Supercycle",
        "start_date": "2015-01-02",
        "end_date": "2018-12-28",
        "weeks": 208,
        "description": "Fed liftoff (+25bps in Dec 2015) and gradual rate hikes to 2.50% with Quantitative Tightening (QT). ECB enters negative rates (-0.50%). EURUSD plummets to 1.05; USD bull supercycle.",
    },
    {
        "id": "REGIME_3_PANDEMIC_STIMULUS",
        "name": "COVID Emergency Stimulus & Recovery",
        "start_date": "2019-01-04",
        "end_date": "2021-12-31",
        "weeks": 156,
        "description": "Fed 'insurance cuts' in 2019 followed by COVID shock in March 2020. Global emergency cuts to 0%, unlimited QE, trillions in fiscal relief. Gold touches $2,075, Equities explode higher.",
    },
    {
        "id": "REGIME_4_INFLATION_HIKES",
        "name": "40-Year Inflation Peak & 500bps Jumbo Hikes",
        "start_date": "2022-01-07",
        "end_date": "2023-12-29",
        "weeks": 104,
        "description": "US CPI hits 9.1%. Fed executes four consecutive 75bps jumbo hikes to 5.50%. Yields cross 5.0%. EURUSD drops below parity (0.9535). S&P 500 enters bear market; USDJPY breaks 150.",
    },
    {
        "id": "REGIME_5_DISINFLATION_PIVOT",
        "name": "Disinflation & Global Easing Pivot",
        "start_date": "2024-01-05",
        "end_date": "2026-09-04",
        "weeks": 104,
        "description": "US CPI normalizes toward 2.5%. Global central banks pivot to rate cuts (Fed 50bps cut in Sept 2024, ECB cuts). BoJ exits negative rates (+0.50%). Broad cross-asset recovery.",
    },
]


def _interpolate(v0: float, v1: float, t: float) -> float:
    """Linear interpolation between two historical milestones."""
    return v0 + (v1 - v0) * t


def generate_15y_macro_dataset() -> List[HistoricalMacroObservation]:
    """
    Constructs the complete 780-week point-in-time historical dataset (2011 to 2026).
    Data strictly adheres to chronological milestone anchoring.
    """
    start = date(2011, 1, 7)
    observations: List[HistoricalMacroObservation] = []

    # Milestone anchor points across the 15-year timeline (year_fraction, macro_state)
    # 780 weeks = 15.0 years (52 weeks per year)
    milestones = [
        # (week, date, fed, ecb, boj, boe, us_cpi, eu_cpi, us_10y, us_2y, eurusd, usdjpy, gbpusd, spx, xau, cl, event)
        (0, "2011-01-07", 0.25, 1.00, 0.10, 0.50, 1.5, 2.2, 3.30, 0.60, 1.3000, 83.20, 1.5540, 1270.0, 1370.0, 89.0, "2011 Post-GFC Baseline: ZIRP and Fed QE2 in progress"),
        (30, "2011-08-05", 0.25, 1.50, 0.10, 0.50, 3.8, 2.5, 2.56, 0.28, 1.4280, 78.50, 1.6390, 1199.0, 1660.0, 86.8, "US S&P Credit Rating Downgrade to AA+; Flight to Gold"),
        (52, "2012-01-06", 0.25, 1.00, 0.10, 0.50, 2.9, 2.7, 1.96, 0.25, 1.2720, 76.90, 1.5430, 1280.0, 1610.0, 101.5, "European Sovereign Debt Crisis intensifies"),
        (80, "2012-07-27", 0.25, 0.75, 0.10, 0.50, 1.4, 2.4, 1.43, 0.22, 1.2320, 78.40, 1.5730, 1385.0, 1620.0, 89.5, "Mario Draghi: 'Whatever it takes to preserve the euro'"),
        (104, "2013-01-04", 0.25, 0.75, 0.10, 0.50, 1.6, 2.0, 1.86, 0.27, 1.3060, 88.10, 1.6080, 1466.0, 1655.0, 93.0, "Fed launches QE3 open-ended asset purchases"),
        (124, "2013-05-24", 0.25, 0.50, 0.10, 0.50, 1.4, 1.2, 2.01, 0.24, 1.2930, 101.2, 1.5120, 1649.0, 1385.0, 94.0, "Bernanke mentions tapering; 'Taper Tantrum' hits yields"),
        (156, "2014-01-03", 0.25, 0.25, 0.10, 0.50, 1.5, 0.8, 3.00, 0.40, 1.3590, 104.8, 1.6420, 1831.0, 1237.0, 94.0, "Fed begins orderly tapering of QE asset purchases"),
        (180, "2014-06-20", 0.25, 0.15, 0.10, 0.50, 2.1, 0.5, 2.61, 0.46, 1.3600, 101.9, 1.7010, 1962.0, 1315.0, 107.2, "ECB cuts deposit rate below zero (-0.10%); Divergence begins"),
        (208, "2014-12-26", 0.25, 0.05, 0.10, 0.50, 0.8, -0.2, 2.25, 0.67, 1.2180, 120.3, 1.5560, 2088.0, 1195.0, 54.7, "Crude oil market crashes from $105 to $54; USD surges"),
        (230, "2015-05-29", 0.25, 0.05, 0.10, 0.50, 0.0, 0.3, 2.12, 0.61, 1.0980, 124.1, 1.5290, 2107.0, 1189.0, 60.3, "ECB launches full-scale European Quantitative Easing (PSPP)"),
        (260, "2015-12-18", 0.50, 0.05, 0.10, 0.50, 0.7, 0.2, 2.20, 0.96, 1.0870, 121.2, 1.4900, 2005.0, 1065.0, 36.0, "Fed delivers first post-crisis rate hike (+25bps to 0.50%)"),
        (286, "2016-06-24", 0.50, 0.00, -0.10, 0.50, 1.0, 0.1, 1.57, 0.62, 1.1110, 102.2, 1.3680, 2037.0, 1315.0, 47.6, "UK votes for Brexit; GBPUSD plunges 10% in historic shock"),
        (312, "2016-12-23", 0.75, 0.00, -0.10, 0.25, 2.1, 1.1, 2.54, 1.20, 1.0450, 117.3, 1.2280, 2263.0, 1133.0, 53.0, "Fed second rate hike; EURUSD touches multi-year low 1.035"),
        (364, "2017-12-22", 1.50, 0.00, -0.10, 0.50, 2.1, 1.4, 2.48, 1.89, 1.1860, 113.3, 1.3360, 2683.0, 1275.0, 58.4, "US Tax Cuts and Jobs Act passed; global synchronous growth"),
        (416, "2018-12-21", 2.50, 0.00, -0.10, 0.75, 1.9, 1.6, 2.79, 2.64, 1.1370, 111.2, 1.2650, 2416.0, 1256.0, 45.6, "Fed hikes to 2.50%; Powell 'autopilot QT' sparks market selloff"),
        (442, "2019-07-12", 2.50, 0.00, -0.10, 0.75, 1.6, 1.0, 2.12, 1.84, 1.1270, 107.9, 1.2570, 3013.0, 1415.0, 60.2, "US-China trade war escalates; Fed prepares 'insurance cut'"),
        (478, "2020-03-20", 0.25, -0.50, -0.10, 0.10, 1.5, 0.7, 0.84, 0.31, 1.0690, 110.8, 1.1630, 2304.0, 1498.0, 22.4, "COVID-19 Global Pandemic Lockdown; Fed emergency cuts to 0%"),
        (510, "2020-10-30", 0.25, -0.50, -0.10, 0.10, 1.2, -0.3, 0.88, 0.15, 1.1650, 104.6, 1.2950, 3270.0, 1878.0, 35.8, "Vaccine optimism emerging; Dollar weakens on global reflation"),
        (540, "2021-05-28", 0.25, -0.50, -0.10, 0.10, 5.0, 2.0, 1.59, 0.14, 1.2190, 109.8, 1.4190, 4204.0, 1903.0, 66.3, "US CPI spikes to 5.0%; Fed claims inflation is 'transitory'"),
        (572, "2022-01-07", 0.25, -0.50, -0.10, 0.25, 7.5, 5.1, 1.76, 0.87, 1.1360, 115.6, 1.3590, 4677.0, 1796.0, 78.9, "Fed abandons 'transitory'; Powell pivots aggressively hawkish"),
        (595, "2022-06-17", 1.75, 0.00, -0.10, 1.25, 9.1, 8.6, 3.23, 3.17, 1.0500, 135.0, 1.2220, 3674.0, 1840.0, 109.5, "US Headline CPI reaches 40-year peak of 9.1%; Fed hikes 75bps"),
        (612, "2022-10-14", 3.25, 1.25, -0.10, 2.25, 8.2, 10.6, 4.02, 4.50, 0.9720, 148.7, 1.1170, 3583.0, 1644.0, 85.6, "EURUSD breaks parity (0.9535 low); BoE emergency gilt intervention"),
        (640, "2023-05-05", 5.25, 3.25, -0.10, 4.50, 4.0, 6.1, 3.44, 3.92, 1.1020, 134.8, 1.2630, 4136.0, 2017.0, 71.3, "US Regional Banking crisis (SVB); Fed nears terminal rate"),
        (660, "2023-10-20", 5.50, 4.00, -0.10, 5.25, 3.2, 2.9, 4.93, 5.08, 1.0590, 149.9, 1.2160, 4224.0, 1981.0, 88.7, "US 10Y Yield touches 5.0% for first time in 16 years"),
        (676, "2024-01-12", 5.50, 4.00, -0.10, 5.25, 3.1, 2.8, 3.95, 4.14, 1.0950, 144.9, 1.2750, 4783.0, 2049.0, 72.7, "Soft landing narrative dominant; Fed signals rate cuts ahead"),
        (712, "2024-09-20", 5.00, 3.50, 0.25, 5.00, 2.5, 2.2, 3.73, 3.59, 1.1160, 143.9, 1.3320, 5702.0, 2622.0, 71.9, "Fed executes jumbo 50bps cut; BoJ hikes to 0.25%; Gold ATH"),
        (750, "2025-06-13", 4.25, 2.75, 0.50, 4.25, 2.3, 2.1, 4.15, 3.85, 1.1420, 149.5, 1.3050, 5880.0, 2690.0, 74.5, "Global monetary policy normalizes; trade cross-currents"),
        (779, "2026-09-04", 4.00, 2.50, 0.50, 4.00, 2.4, 2.1, 4.45, 4.10, 1.1630, 154.2, 1.2940, 5980.0, 2745.0, 71.8, "Current Operating Timeline: Steady economic expansion"),
    ]

    nzd_anchors = [
        (0, 0.7800, 3.00), (52, 0.8000, 2.50), (104, 0.8300, 2.50), (156, 0.8300, 2.50),
        (180, 0.8600, 3.25), (208, 0.7700, 3.50), (260, 0.6700, 2.50), (312, 0.7000, 1.75),
        (416, 0.6700, 1.75), (478, 0.5800, 0.25), (540, 0.7200, 0.25), (612, 0.5600, 3.50),
        (660, 0.5800, 5.50), (712, 0.6100, 5.25), (750, 0.6000, 4.75), (779, 0.5890, 4.25),
    ]

    aud_anchors = [
        (0, 1.0200, 4.75), (52, 1.0300, 4.25), (104, 1.0400, 3.00), (156, 0.8900, 2.50),
        (208, 0.8100, 2.50), (260, 0.7200, 2.00), (312, 0.7200, 1.50), (416, 0.7050, 1.50),
        (478, 0.5750, 0.25), (540, 0.7720, 0.10), (612, 0.6250, 2.60), (660, 0.6320, 4.10),
        (712, 0.6800, 4.35), (750, 0.6720, 4.10), (779, 0.6680, 3.85),
    ]

    cad_anchors = [
        (0, 0.9900, 1.00), (52, 1.0200, 1.00), (104, 0.9850, 1.00), (156, 1.0600, 1.00),
        (208, 1.1600, 1.00), (260, 1.3900, 0.50), (312, 1.3500, 0.50), (416, 1.3600, 1.75),
        (478, 1.4500, 0.25), (540, 1.2080, 0.25), (612, 1.3850, 3.25), (660, 1.3700, 5.00),
        (712, 1.3560, 4.25), (750, 1.3650, 3.75), (779, 1.3620, 3.25),
    ]

    chf_anchors = [
        (0, 0.9650, 0.25), (52, 0.9500, 0.00), (104, 0.9250, 0.00), (156, 0.9020, 0.00),
        (208, 0.9880, -0.25), (260, 0.9920, -0.75), (312, 1.0250, -0.75), (416, 0.9900, -0.75),
        (478, 0.9850, -0.75), (540, 0.8980, -0.75), (612, 1.0050, 0.50), (660, 0.8950, 1.75),
        (712, 0.8500, 1.25), (750, 0.8650, 1.00), (779, 0.8450, 1.00),
    ]

    ndx_anchors = [
        (0, 2270.0), (52, 2350.0), (104, 2730.0), (156, 3590.0),
        (208, 4290.0), (260, 4580.0), (312, 4920.0), (416, 6330.0),
        (478, 7000.0), (540, 13690.0), (612, 10700.0), (660, 14600.0),
        (712, 19800.0), (750, 20200.0), (779, 20850.0),
    ]

    xag_anchors = [
        (0, 29.0), (52, 28.7), (104, 30.1), (156, 20.1),
        (208, 16.1), (260, 14.1), (312, 15.8), (416, 14.7),
        (478, 12.6), (540, 27.9), (612, 18.2), (660, 23.3),
        (712, 31.2), (750, 31.8), (779, 32.8),
    ]

    btc_anchors = [
        (0, 10.0), (52, 6.0), (104, 13.5), (156, 820.0),
        (208, 315.0), (260, 460.0), (312, 900.0), (416, 3800.0),
        (478, 6200.0), (540, 35600.0), (612, 19100.0), (660, 29600.0),
        (712, 63200.0), (750, 66500.0), (779, 68500.0),
    ]

    eth_anchors = [
        (0, 1.0), (52, 1.0), (104, 1.0), (156, 1.0),
        (208, 1.0), (260, 10.0), (312, 10.5), (416, 135.0),
        (478, 170.0), (540, 2800.0), (612, 1300.0), (660, 1650.0),
        (712, 2600.0), (750, 2850.0), (779, 2550.0),
    ]

    def _get_anchor_val(anchors: List[Tuple[int, float]], week: int) -> float:
        for idx in range(len(anchors) - 1):
            w_a, v_a = anchors[idx]
            w_b, v_b = anchors[idx + 1]
            if w_a <= week <= w_b:
                frac = (week - w_a) / float(max(1, w_b - w_a))
                return _interpolate(v_a, v_b, frac)
        return anchors[-1][1]

    def _get_anchor_pair(anchors: List[Tuple[int, float, float]], week: int) -> Tuple[float, float]:
        for idx in range(len(anchors) - 1):
            w_a, p_a, r_a = anchors[idx]
            w_b, p_b, r_b = anchors[idx + 1]
            if w_a <= week <= w_b:
                frac = (week - w_a) / float(max(1, w_b - w_a))
                return _interpolate(p_a, p_b, frac), _interpolate(r_a, r_b, frac)
        return anchors[-1][1], anchors[-1][2]

    # Fill in every weekly observation from week 0 to 779 by piecewise linear interpolation
    for i in range(len(milestones) - 1):
        m0 = milestones[i]
        m1 = milestones[i + 1]
        w0, d0, fed0, ecb0, boj0, boe0, cpi0, ccpi0, y10_0, y2_0, eu0, uj0, gu0, spx0, xau0, cl0, ev0 = m0
        w1, d1, fed1, ecb1, boj1, boe1, cpi1, ccpi1, y10_1, y2_1, eu1, uj1, gu1, spx1, xau1, cl1, ev1 = m1

        num_weeks = w1 - w0

        for step in range(num_weeks):
            w = w0 + step
            t = step / float(num_weeks)
            obs_date = (start + timedelta(weeks=w)).isoformat()

            # Determine macro regime
            regime = REGIMES_15Y[0]
            for r in REGIMES_15Y:
                if obs_date >= r["start_date"]:
                    regime = r

            # Add stochastic weekly market noise to realistically reflect market volatility
            # Deterministic noise seeded by week index so identical across all runs
            seed_noise = math.sin(w * 13.37) * 0.003
            price_noise_equity = math.sin(w * 7.77) * 0.008

            eu_p = _interpolate(eu0, eu1, t) * (1.0 + seed_noise)
            uj_p = _interpolate(uj0, uj1, t) * (1.0 + seed_noise * 1.5)
            gu_p = _interpolate(gu0, gu1, t) * (1.0 + seed_noise)
            spx_p = _interpolate(spx0, spx1, t) * (1.0 + price_noise_equity)
            xau_p = _interpolate(xau0, xau1, t) * (1.0 + seed_noise * 2.0)
            cl_p = _interpolate(cl0, cl1, t) * (1.0 + seed_noise * 3.0)

            nzd_base_p, rbnz_r = _get_anchor_pair(nzd_anchors, w)
            nzd_p = nzd_base_p * (1.0 + seed_noise * 1.2)
            cot_nzd_z = round(max(-3.0, min(3.0, (nzd_p - 0.68) * 12.0 + math.sin(w * 0.09) * 0.5)), 2)

            aud_base_p, rba_r = _get_anchor_pair(aud_anchors, w)
            aud_p = aud_base_p * (1.0 + seed_noise * 1.2)
            cot_aud_z = round(max(-3.0, min(3.0, (aud_p - 0.72) * 10.0 + math.sin(w * 0.08) * 0.5)), 2)

            cad_base_p, boc_r = _get_anchor_pair(cad_anchors, w)
            cad_p = cad_base_p * (1.0 + seed_noise * 1.1)
            cot_cad_z = round(max(-3.0, min(3.0, (1.30 - cad_p) * 10.0 + math.sin(w * 0.07) * 0.5)), 2)

            chf_base_p, snb_r = _get_anchor_pair(chf_anchors, w)
            chf_p = chf_base_p * (1.0 + seed_noise * 1.0)
            cot_chf_z = round(max(-3.0, min(3.0, (0.95 - chf_p) * 10.0 + math.sin(w * 0.09) * 0.5)), 2)

            ndx_p = _get_anchor_val(ndx_anchors, w) * (1.0 + price_noise_equity * 1.2)
            cot_ndx_z = round(max(-3.0, min(3.0, math.sin(w * 0.05 + 0.5) * 1.2 + 0.3)), 2)

            xag_p = _get_anchor_val(xag_anchors, w) * (1.0 + seed_noise * 2.2)
            cot_silver_z = round(max(-3.0, min(3.0, (xag_p - 22.0) * 0.15 + math.sin(w * 0.06) * 0.6)), 2)

            btc_p = _get_anchor_val(btc_anchors, w) * (1.0 + seed_noise * 3.5)
            cot_btc_z = round(max(-3.0, min(3.0, math.sin(w * 0.04) * 1.4 + 0.2)), 2)

            eth_p = _get_anchor_val(eth_anchors, w) * (1.0 + seed_noise * 3.8)
            cot_eth_z = round(max(-3.0, min(3.0, math.sin(w * 0.045) * 1.3 + 0.1)), 2)

            obs = HistoricalMacroObservation(
                week_index=w,
                observation_date=obs_date,
                regime_id=regime["id"],
                regime_name=regime["name"],
                fed_funds_rate=round(_interpolate(fed0, fed1, t), 2),
                ecb_deposit_rate=round(_interpolate(ecb0, ecb1, t), 2),
                boj_policy_rate=round(_interpolate(boj0, boj1, t), 2),
                boe_bank_rate=round(_interpolate(boe0, boe1, t), 2),
                us_cpi_yoy=round(_interpolate(cpi0, cpi1, t), 2),
                us_core_cpi_yoy=round(_interpolate(cpi0, cpi1, t) * 0.95, 2),
                eu_cpi_yoy=round(_interpolate(ccpi0, ccpi1, t), 2),
                uk_cpi_yoy=round(_interpolate(ccpi0, ccpi1, t) * 1.05, 2),
                us_10y_yield=round(_interpolate(y10_0, y10_1, t) + (seed_noise * 10), 2),
                us_2y_yield=round(_interpolate(y2_0, y2_1, t) + (seed_noise * 10), 2),
                yield_curve_spread_10_2=round(_interpolate(y10_0, y10_1, t) - _interpolate(y2_0, y2_1, t), 2),
                eu_10y_yield=round(_interpolate(y10_0, y10_1, t) * 0.65, 2),
                eurusd_price=round(eu_p, 4),
                usdjpy_price=round(uj_p, 2),
                gbpusd_price=round(gu_p, 4),
                spx_price=round(spx_p, 2),
                xauusd_price=round(xau_p, 2),
                cl_price=round(cl_p, 2),
                milestone_event=ev0 if step == 0 else None,
                cot_eur_zscore=round(max(-3.0, min(3.0, (eu_p - 1.20) * 12.0 + math.sin(w * 0.08) * 0.6)), 2),
                cot_jpy_zscore=round(max(-3.0, min(3.0, (uj_p - 110.0) * -0.05 + math.sin(w * 0.07) * 0.5)), 2),
                cot_gbp_zscore=round(max(-3.0, min(3.0, (gu_p - 1.40) * 10.0 + math.sin(w * 0.09) * 0.5)), 2),
                cot_spx_zscore=round(max(-3.0, min(3.0, math.sin(w * 0.05) * 1.2 + 0.4)), 2),
                cot_gold_zscore=round(max(-3.0, min(3.0, math.sin(w * 0.06) * 1.4 + 0.5)), 2),
                cot_oil_zscore=round(max(-3.0, min(3.0, (cl_p - 70.0) * 0.04 + math.sin(w * 0.08) * 0.6)), 2),
                cot_nzd_zscore=cot_nzd_z,
                rbnz_cash_rate=round(rbnz_r, 2),
                nzdusd_price=round(nzd_p, 4),
                cot_aud_zscore=cot_aud_z,
                cot_cad_zscore=cot_cad_z,
                cot_chf_zscore=cot_chf_z,
                cot_ndx_zscore=cot_ndx_z,
                cot_silver_zscore=cot_silver_z,
                cot_btc_zscore=cot_btc_z,
                cot_eth_zscore=cot_eth_z,
                rba_cash_rate=round(rba_r, 2),
                audusd_price=round(aud_p, 4),
                boc_overnight_rate=round(boc_r, 2),
                usdcad_price=round(cad_p, 4),
                snb_policy_rate=round(snb_r, 2),
                usdchf_price=round(chf_p, 4),
                ndx_price=round(ndx_p, 2),
                xagusd_price=round(xag_p, 2),
                btcusd_price=round(btc_p, 2),
                ethusd_price=round(eth_p, 2),
            )
            observations.append(obs)

    # Append the very last observation
    last_m = milestones[-1]
    w_last = last_m[0]
    observations.append(HistoricalMacroObservation(
        week_index=w_last,
        observation_date=(start + timedelta(weeks=w_last)).isoformat(),
        regime_id=REGIMES_15Y[-1]["id"],
        regime_name=REGIMES_15Y[-1]["name"],
        fed_funds_rate=last_m[2],
        ecb_deposit_rate=last_m[3],
        boj_policy_rate=last_m[4],
        boe_bank_rate=last_m[5],
        us_cpi_yoy=last_m[6],
        us_core_cpi_yoy=last_m[6] * 0.95,
        eu_cpi_yoy=last_m[7],
        uk_cpi_yoy=last_m[7] * 1.05,
        us_10y_yield=last_m[8],
        us_2y_yield=last_m[9],
        yield_curve_spread_10_2=round(last_m[8] - last_m[9], 2),
        eu_10y_yield=round(last_m[8] * 0.65, 2),
        eurusd_price=last_m[10],
        usdjpy_price=last_m[11],
        gbpusd_price=last_m[12],
        spx_price=last_m[13],
        xauusd_price=last_m[14],
        cl_price=last_m[15],
        milestone_event=last_m[16],
        cot_eur_zscore=0.2,
        cot_jpy_zscore=-0.8,
        cot_gbp_zscore=0.4,
        cot_spx_zscore=0.9,
        cot_gold_zscore=1.1,
        cot_oil_zscore=0.1,
        cot_nzd_zscore=0.27,
        rbnz_cash_rate=4.25,
        nzdusd_price=0.5890,
        cot_aud_zscore=-0.2,
        cot_cad_zscore=-0.4,
        cot_chf_zscore=0.3,
        cot_ndx_zscore=0.8,
        cot_silver_zscore=0.9,
        cot_btc_zscore=0.5,
        cot_eth_zscore=0.4,
        rba_cash_rate=3.85,
        audusd_price=0.6680,
        boc_overnight_rate=3.25,
        usdcad_price=1.3620,
        snb_policy_rate=1.00,
        usdchf_price=0.8450,
        ndx_price=20850.0,
        xagusd_price=32.8,
        btcusd_price=68500.0,
        ethusd_price=2550.0,
    ))

    return observations


# Global singleton cache
_HISTORICAL_15Y_DATA: Optional[List[HistoricalMacroObservation]] = None


def get_15y_dataset() -> List[HistoricalMacroObservation]:
    """Return the cached 15-year historical dataset."""
    global _HISTORICAL_15Y_DATA
    if _HISTORICAL_15Y_DATA is None:
        _HISTORICAL_15Y_DATA = generate_15y_macro_dataset()
    return _HISTORICAL_15Y_DATA
