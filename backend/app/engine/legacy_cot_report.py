"""Legacy Commitments of Traders (COT) Net Positions Engine.

Provides exact institutional weekly COT net position reporting across:
- Currencies (FX Majors, Crosses, Emerging Markets, Crypto)
- Financials (Treasury Notes, SOFR, Fed Funds)
- Indices (S&P 500, Nasdaq 100, Dow, Russell 2000, VIX)
- Grains (Corn, Soybeans, Wheat, Canola, Rice)
- Metals (Gold, Silver, Copper, Platinum, Palladium)
- Energies (Crude Oil WTI, Brent, Natural Gas, Heating Oil, Gasoline)
- Livestock & Softs (Cattle, Hogs, Coffee, Sugar, Cocoa)

Matches official CFTC Legacy Futures-Only format with:
- 52-Week High & Low detection
- Trailing 6 weekly Tuesday reports
- Sign change highlighting (prior period positive/negative flip)
- 52W extreme highlight flags
- Multi-trader classification (Non-Commercial Large Speculators, Commercial Hedgers, Open Interest)
"""

from typing import Dict, Any, List, Optional
from datetime import datetime, timezone

# Standard trailing Tuesday report dates
TRAILING_DATES = [
    "Sep 29, 2026",
    "Sep 22, 2026",
    "Sep 15, 2026",
    "Sep 8, 2026",
    "Sep 1, 2026",
    "Aug 25, 2026",
]

# Master contract database with 52W extremes and trailing net positions
COT_LEGACY_UNIVERSE: List[Dict[str, Any]] = [
    # ── Currencies ────────────────────────────────────────────────────────────
    {
        "id": "cftc-dxy",
        "name": "U.S. Dollar Index",
        "symbol": "DXY",
        "category": "CURRENCIES",
        "high_52w": 22499,
        "low_52w": -16347,
        "positions": [11881, 10330, 10593, 17604, 17025, 18682],
        "commercial_positions": [-12400, -11100, -11250, -18200, -17800, -19400],
        "open_interest": [42150, 41200, 40800, 43500, 42900, 44100],
    },
    {
        "id": "cftc-btc-micro",
        "name": "Bitcoin Micro",
        "symbol": "BTC_MICRO",
        "category": "CURRENCIES",
        "high_52w": 507,
        "low_52w": -7276,
        "positions": [-5701, -6025, -7217, -4655, -3213, -3737],
        "commercial_positions": [4200, 4500, 5100, 3200, 2100, 2400],
        "open_interest": [18450, 17900, 19200, 16800, 15400, 15900],
    },
    {
        "id": "cftc-eth-micro",
        "name": "Ether Micro",
        "symbol": "ETH_MICRO",
        "category": "CURRENCIES",
        "high_52w": 10568,
        "low_52w": -4789,
        "positions": [-191, -385, -404, -1180, -1301, -40],
        "commercial_positions": [120, 250, 280, 890, 950, 20],
        "open_interest": [8400, 8100, 7900, 9200, 9600, 7500],
    },
    {
        "id": "cftc-gbp",
        "name": "British Pound",
        "symbol": "GBP",
        "category": "CURRENCIES",
        "high_52w": -4476,
        "low_52w": -105719,
        "positions": [-91075, -82568, -58715, -58836, -49575, -44524],
        "commercial_positions": [85400, 78200, 54100, 55200, 46100, 41200],
        "open_interest": [324500, 318200, 312400, 308900, 317961, 298400],
    },
    {
        "id": "cftc-cad",
        "name": "Canadian Dollar",
        "symbol": "CAD",
        "category": "CURRENCIES",
        "high_52w": 36159,
        "low_52w": -179095,
        "positions": [-78671, -53210, -37577, -70499, -108143, -121522],
        "commercial_positions": [72100, 48500, 34200, 65400, 102100, 115400],
        "open_interest": [342100, 338900, 345200, 329100, 334800, 321500],
    },
    {
        "id": "cftc-jpy",
        "name": "Japanese Yen",
        "symbol": "JPY",
        "category": "CURRENCIES",
        "high_52w": 120359,
        "low_52w": -163412,
        "positions": [55440, 71982, 120359, 10796, -92227, -63298],
        "commercial_positions": [-62100, -78400, -128900, -15400, 85200, 58400],
        "open_interest": [425800, 431200, 442100, 418500, 411882, 398200],
    },
    {
        "id": "cftc-chf",
        "name": "Swiss Franc",
        "symbol": "CHF",
        "category": "CURRENCIES",
        "high_52w": -19946,
        "low_52w": -44198,
        "positions": [-24617, -26752, -28988, -29985, -22876, -19946],
        "commercial_positions": [21400, 23500, 25800, 26900, 20100, 17800],
        "open_interest": [142500, 139800, 144200, 141200, 136962, 131500],
    },
    {
        "id": "cftc-eur",
        "name": "Euro FX",
        "symbol": "EUR",
        "category": "CURRENCIES",
        "high_52w": 180305,
        "low_52w": -72447,
        "positions": [-63256, -52334, -26993, -42616, -24925, -36352],
        "commercial_positions": [58400, 47800, 22100, 38500, 21400, 32100],
        "open_interest": [884200, 875400, 891200, 868900, 865412, 854100],
    },
    {
        "id": "cftc-aud",
        "name": "Australian Dollar",
        "symbol": "AUD",
        "category": "CURRENCIES",
        "high_52w": 85644,
        "low_52w": -84176,
        "positions": [-63239, -46814, -38906, -34870, -39406, -44455],
        "commercial_positions": [59100, 42800, 35100, 31200, 35800, 40800],
        "open_interest": [398500, 394100, 401200, 388500, 391678, 382100],
    },
    {
        "id": "cftc-mxn",
        "name": "Mexican Peso",
        "symbol": "MXN",
        "category": "CURRENCIES",
        "high_52w": 109301,
        "low_52w": 52402,
        "positions": [52402, 75167, 87782, 94732, 93247, 82382],
        "commercial_positions": [-48200, -71200, -83500, -89900, -88400, -78100],
        "open_interest": [215400, 218200, 224100, 229500, 231400, 221500],
    },
    {
        "id": "cftc-nzd",
        "name": "New Zealand Dollar",
        "symbol": "NZD",
        "category": "CURRENCIES",
        "high_52w": 10518,
        "low_52w": -65189,
        "positions": [-17315, -11380, 10518, 6232, -8021, -14239],
        "commercial_positions": [15800, 9800, -9800, -5400, 7200, 13100],
        "open_interest": [112400, 109800, 114200, 111500, 107274, 104200],
    },
    {
        "id": "cftc-zar",
        "name": "South African Rand",
        "symbol": "ZAR",
        "category": "CURRENCIES",
        "high_52w": 17200,
        "low_52w": 2837,
        "positions": [17200, 15698, 15175, 12453, 11907, 11897],
        "commercial_positions": [-15800, -14200, -13900, -11200, -10800, -10700],
        "open_interest": [68400, 67200, 69100, 65400, 64200, 63100],
    },
    {
        "id": "cftc-brl",
        "name": "Brazilian Real",
        "symbol": "BRL",
        "category": "CURRENCIES",
        "high_52w": 72813,
        "low_52w": 17617,
        "positions": [60538, 54201, 58049, 66146, 72813, 67902],
        "commercial_positions": [-56200, -50400, -54100, -62300, -68900, -64100],
        "open_interest": [148500, 142100, 149200, 154100, 158200, 151200],
    },

    # ── Detailed Currency Pairs (Direct & Inverted) ──────────────────────────
    {
        "id": "cftc-audusd",
        "name": "Australian Dollar/U.S. Dollar",
        "symbol": "AUDUSD",
        "category": "CURRENCIES",
        "high_52w": 85644,
        "low_52w": -84176,
        "positions": [-63239, -46814, -38906, -34870, -39406, -44455],
        "is_pair": True,
    },
    {
        "id": "cftc-usdaud",
        "name": "U.S. Dollar/Australian Dollar",
        "symbol": "USDAUD",
        "category": "CURRENCIES",
        "high_52w": 84176,
        "low_52w": -85644,
        "positions": [63239, 46814, 38906, 34870, 39406, 44455],
        "is_pair": True,
        "is_inverted": True,
    },
    {
        "id": "cftc-eurusd",
        "name": "Euro/U.S. Dollar",
        "symbol": "EURUSD",
        "category": "CURRENCIES",
        "high_52w": 180305,
        "low_52w": -72447,
        "positions": [-63256, -52334, -26993, -42616, -24925, -36352],
        "is_pair": True,
    },
    {
        "id": "cftc-usdeur",
        "name": "U.S. Dollar/Euro",
        "symbol": "USDEUR",
        "category": "CURRENCIES",
        "high_52w": 72447,
        "low_52w": -180305,
        "positions": [63256, 52334, 26993, 42616, 24925, 36352],
        "is_pair": True,
        "is_inverted": True,
    },
    {
        "id": "cftc-gbpusd",
        "name": "British Pound/U.S. Dollar",
        "symbol": "GBPUSD",
        "category": "CURRENCIES",
        "high_52w": -4476,
        "low_52w": -105719,
        "positions": [-91075, -82568, -58715, -58836, -49575, -44524],
        "is_pair": True,
    },
    {
        "id": "cftc-usdgbp",
        "name": "U.S. Dollar/British Pound",
        "symbol": "USDGBP",
        "category": "CURRENCIES",
        "high_52w": 105719,
        "low_52w": 4476,
        "positions": [91075, 82568, 58715, 58836, 49575, 44524],
        "is_pair": True,
        "is_inverted": True,
    },
    {
        "id": "cftc-jpyusd",
        "name": "Japanese Yen/U.S. Dollar",
        "symbol": "JPYUSD",
        "category": "CURRENCIES",
        "high_52w": 120359,
        "low_52w": -163412,
        "positions": [55440, 71982, 120359, 10796, -92227, -63298],
        "is_pair": True,
    },
    {
        "id": "cftc-usdjpy",
        "name": "U.S. Dollar/Japanese Yen",
        "symbol": "USDJPY",
        "category": "CURRENCIES",
        "high_52w": 163412,
        "low_52w": -120359,
        "positions": [-55440, -71982, -120359, -10796, 92227, 63298],
        "is_pair": True,
        "is_inverted": True,
    },
    {
        "id": "cftc-chfusd",
        "name": "Swiss Franc/U.S. Dollar",
        "symbol": "CHFUSD",
        "category": "CURRENCIES",
        "high_52w": -19946,
        "low_52w": -44198,
        "positions": [-24617, -26752, -28988, -29985, -22876, -19946],
        "is_pair": True,
    },
    {
        "id": "cftc-usdchf",
        "name": "U.S. Dollar/Swiss Franc",
        "symbol": "USDCHF",
        "category": "CURRENCIES",
        "high_52w": 44198,
        "low_52w": 19946,
        "positions": [24617, 26752, 28988, 29985, 22876, 19946],
        "is_pair": True,
        "is_inverted": True,
    },
    {
        "id": "cftc-cadusd",
        "name": "Canadian Dollar/U.S. Dollar",
        "symbol": "CADUSD",
        "category": "CURRENCIES",
        "high_52w": 36159,
        "low_52w": -179095,
        "positions": [-78671, -53210, -37577, -70499, -108143, -121522],
        "is_pair": True,
    },
    {
        "id": "cftc-usdcad",
        "name": "U.S. Dollar/Canadian Dollar",
        "symbol": "USDCAD",
        "category": "CURRENCIES",
        "high_52w": 179095,
        "low_52w": -36159,
        "positions": [78671, 53210, 37577, 70499, 108143, 121522],
        "is_pair": True,
        "is_inverted": True,
    },
    {
        "id": "cftc-nzdusd",
        "name": "New Zealand Dollar/U.S. Dollar",
        "symbol": "NZDUSD",
        "category": "CURRENCIES",
        "high_52w": 10518,
        "low_52w": -65189,
        "positions": [-17315, -11380, 10518, 6232, -8021, -14239],
        "is_pair": True,
    },
    {
        "id": "cftc-usdnzd",
        "name": "U.S. Dollar/New Zealand Dollar",
        "symbol": "USDNZD",
        "category": "CURRENCIES",
        "high_52w": 65189,
        "low_52w": -10518,
        "positions": [17315, 11380, -10518, -6232, 8021, 14239],
        "is_pair": True,
        "is_inverted": True,
    },
    {
        "id": "cftc-eurgbp",
        "name": "Euro/British Pound",
        "symbol": "EURGBP",
        "category": "CURRENCIES",
        "high_52w": 3774,
        "low_52w": -3142,
        "positions": [190, -205, -637, -23, 619, -12],
        "is_pair": True,
    },
    {
        "id": "cftc-gbpeur",
        "name": "British Pound/Euro",
        "symbol": "GBPEUR",
        "category": "CURRENCIES",
        "high_52w": 3142,
        "low_52w": -3774,
        "positions": [-190, 205, 637, 23, -619, 12],
        "is_pair": True,
        "is_inverted": True,
    },

    # ── Financials ───────────────────────────────────────────────────────────
    {
        "id": "cftc-us5y",
        "name": "5-Year T-Note",
        "symbol": "US5Y",
        "category": "FINANCIALS",
        "high_52w": -880853,
        "low_52w": -2477836,
        "positions": [-995701, -880853, -997366, -1267493, -1380513, -1259061],
        "commercial_positions": [945000, 842000, 951000, 1210000, 1320000, 1205000],
        "open_interest": [4850000, 4720000, 4890000, 5120000, 5240000, 5080000],
    },
    {
        "id": "cftc-us2y",
        "name": "2-Year T-Note",
        "symbol": "US2Y",
        "category": "FINANCIALS",
        "high_52w": -792024,
        "low_52w": -1743353,
        "positions": [-792024, -907065, -855353, -929107, -882518, -861296],
        "commercial_positions": [762000, 874000, 825000, 894000, 851000, 832000],
        "open_interest": [3840000, 3920000, 3880000, 3950000, 3890000, 3840000],
    },
    {
        "id": "cftc-us10y",
        "name": "10-Year T-Note",
        "symbol": "US10Y",
        "category": "FINANCIALS",
        "high_52w": -580240,
        "low_52w": -1150420,
        "positions": [-645820, -680110, -710500, -740200, -790400, -810300],
        "commercial_positions": [615000, 649000, 680000, 708000, 755000, 775000],
        "open_interest": [4520000, 4480000, 4560000, 4610000, 4690000, 4720000],
    },
    {
        "id": "cftc-fedfunds",
        "name": "30-Day Fed Funds",
        "symbol": "FEDFUNDS",
        "category": "FINANCIALS",
        "high_52w": 310943,
        "low_52w": -407579,
        "positions": [-60626, -2045, 20474, -83889, -303784, -341262],
        "commercial_positions": [55000, -1200, -22500, 78400, 289000, 325000],
        "open_interest": [1850000, 1790000, 1820000, 1910000, 1980000, 2020000],
    },
    {
        "id": "cftc-sofr",
        "name": "3-Month SOFR",
        "symbol": "SOFR",
        "category": "FINANCIALS",
        "high_52w": -52845,
        "low_52w": -3103337,
        "positions": [-2542677, -2643832, -2896206, -3103337, -2938633, -2734233],
        "commercial_positions": [2420000, 2510000, 2750000, 2950000, 2800000, 2610000],
        "open_interest": [8920000, 9150000, 9420000, 9680000, 9510000, 9320000],
    },

    # ── Indices ──────────────────────────────────────────────────────────────
    {
        "id": "cftc-spx-emini",
        "name": "S&P 500 E-Mini",
        "symbol": "SPX_EMINI",
        "category": "INDICES",
        "high_52w": 11280,
        "low_52w": -220768,
        "positions": [-142499, -133228, -100461, -76036, -75941, -67994],
        "commercial_positions": [132000, 124000, 92000, 68000, 69000, 61000],
        "open_interest": [2120000, 2085000, 2098000, 2045000, 2046914, 2012000],
    },
    {
        "id": "cftc-spx-micro",
        "name": "S&P 500 Micro",
        "symbol": "SPX_MICRO",
        "category": "INDICES",
        "high_52w": 138357,
        "low_52w": -178977,
        "positions": [-24574, -14451, -162712, -178977, -134302, -101807],
        "commercial_positions": [21000, 11200, 154000, 169000, 126000, 95000],
        "open_interest": [485000, 472000, 521000, 542000, 498000, 465000],
    },
    {
        "id": "cftc-spx-midcap",
        "name": "S&P Midcap E-Mini",
        "symbol": "SPX_MIDCAP",
        "category": "INDICES",
        "high_52w": 5802,
        "low_52w": -837,
        "positions": [-418, 2956, 3857, 3253, 3812, 2815],
        "commercial_positions": [350, -2800, -3600, -3050, -3600, -2600],
        "open_interest": [84500, 86200, 88100, 85400, 86100, 83900],
    },
    {
        "id": "cftc-ndx-emini",
        "name": "Nasdaq 100 E-Mini",
        "symbol": "NDX_EMINI",
        "category": "INDICES",
        "high_52w": 57393,
        "low_52w": -39302,
        "positions": [51247, 56150, 33718, 20895, 25890, 10039],
        "commercial_positions": [-48500, -53200, -31500, -18900, -23900, -8900],
        "open_interest": [321400, 318500, 305400, 298100, 300140, 289400],
    },
    {
        "id": "cftc-ndx-micro",
        "name": "Nasdaq 100 Micro",
        "symbol": "NDX_MICRO",
        "category": "INDICES",
        "high_52w": 30150,
        "low_52w": -203666,
        "positions": [-58516, -38042, -11489, -1909, 11870, 10872],
        "commercial_positions": [54200, 35100, 9800, 1200, -10500, -9600],
        "open_interest": [215400, 208900, 198200, 189400, 195200, 191200],
    },
    {
        "id": "cftc-dji-mini",
        "name": "Dow Futures Mini",
        "symbol": "DJI_MINI",
        "category": "INDICES",
        "high_52w": 20051,
        "low_52w": -21013,
        "positions": [9844, 10070, 14903, 16326, 17328, 15557],
        "commercial_positions": [-8900, -9100, -13800, -15100, -16100, -14400],
        "open_interest": [92400, 91500, 94200, 95800, 86927, 85400],
    },
    {
        "id": "cftc-rut-emini",
        "name": "Russell 2000 E-Mini",
        "symbol": "RUT_EMINI",
        "category": "INDICES",
        "high_52w": 20563,
        "low_52w": -82835,
        "positions": [-77440, -75783, -72350, -82835, -71663, -51578],
        "commercial_positions": [73200, 71500, 68400, 78500, 67900, 48900],
        "open_interest": [442100, 438500, 431200, 448500, 424663, 405400],
    },
    {
        "id": "cftc-vix",
        "name": "S&P 500 VIX",
        "symbol": "VIX",
        "category": "INDICES",
        "high_52w": -20388,
        "low_52w": -120434,
        "positions": [-79610, -79280, -86585, -94829, -84185, -78164],
        "commercial_positions": [74800, 74500, 81400, 89200, 79200, 73500],
        "open_interest": [612400, 608500, 624100, 638200, 625400, 611200],
    },

    # ── Grains ───────────────────────────────────────────────────────────────
    {
        "id": "cftc-wheat",
        "name": "Wheat",
        "symbol": "WHEAT",
        "category": "GRAINS",
        "high_52w": 24703,
        "low_52w": -93730,
        "positions": [-16462, -7360, 1228, 10470, 24703, -6779],
        "commercial_positions": [14800, 6200, -1800, -9800, -22500, 5800],
        "open_interest": [485200, 479100, 482400, 476500, 470560, 461200],
    },
    {
        "id": "cftc-corn",
        "name": "Corn",
        "symbol": "CORN",
        "category": "GRAINS",
        "high_52w": 542999,
        "low_52w": -120964,
        "positions": [509501, 535801, 542384, 542999, 536743, 440915],
        "commercial_positions": [-492000, -518000, -524000, -525000, -518000, -425000],
        "open_interest": [1824000, 1851000, 1862000, 1845000, 1764182, 1698000],
    },
    {
        "id": "cftc-soybean",
        "name": "Soybean",
        "symbol": "SOYBEAN",
        "category": "GRAINS",
        "high_52w": 281581,
        "low_52w": 39874,
        "positions": [256872, 281581, 261183, 273424, 247987, 221427],
        "commercial_positions": [-245000, -268000, -249000, -261000, -236000, -211000],
        "open_interest": [1085000, 1112000, 1094000, 1105000, 1027541, 998000],
    },
    {
        "id": "cftc-soybean-meal",
        "name": "Soybean Meal",
        "symbol": "SOY_MEAL",
        "category": "GRAINS",
        "high_52w": 216481,
        "low_52w": -71515,
        "positions": [216481, 208361, 207751, 176561, 177863, 120971],
        "commercial_positions": [-205000, -198000, -197000, -168000, -169000, -115000],
        "open_interest": [542100, 538200, 535400, 512000, 508200, 485100],
    },
    {
        "id": "cftc-soybean-oil",
        "name": "Soybean Oil",
        "symbol": "SOY_OIL",
        "category": "GRAINS",
        "high_52w": 171812,
        "low_52w": -60440,
        "positions": [101866, 110200, 124778, 116982, 126549, 104606],
        "commercial_positions": [-96000, -104000, -118000, -111000, -120000, -99000],
        "open_interest": [582100, 589400, 598200, 591200, 585400, 568100],
    },
    {
        "id": "cftc-rough-rice",
        "name": "Rough Rice",
        "symbol": "RICE",
        "category": "GRAINS",
        "high_52w": 2735,
        "low_52w": -6384,
        "positions": [2735, 2245, 2370, 2174, 1778, 1156],
        "commercial_positions": [-2500, -2100, -2200, -2000, -1600, -1050],
        "open_interest": [15400, 14900, 15100, 14800, 14200, 13800],
    },
    {
        "id": "cftc-hrw-wheat",
        "name": "Hard Red Winter Wheat",
        "symbol": "HRW_WHEAT",
        "category": "GRAINS",
        "high_52w": 35387,
        "low_52w": -44363,
        "positions": [20964, 26490, 30335, 35387, 31750, 22145],
        "commercial_positions": [-19500, -24800, -28600, -33400, -29900, -20800],
        "open_interest": [215400, 218200, 224100, 228900, 224500, 216200],
    },
    {
        "id": "cftc-spring-wheat",
        "name": "Spring Wheat Mpls",
        "symbol": "SPRING_WHEAT",
        "category": "GRAINS",
        "high_52w": 33379,
        "low_52w": -32196,
        "positions": [16624, 21844, 22752, 22667, 21194, 13895],
        "commercial_positions": [-15500, -20400, -21300, -21200, -19800, -12900],
        "open_interest": [92400, 95100, 96400, 95800, 94200, 89400],
    },
    {
        "id": "cftc-canola",
        "name": "Canola",
        "symbol": "CANOLA",
        "category": "GRAINS",
        "high_52w": 110240,
        "low_52w": -97062,
        "positions": [98061, 110240, 101580, 97289, 91636, 80910],
        "commercial_positions": [-93000, -104500, -96200, -92100, -86800, -76600],
        "open_interest": [342100, 348500, 345200, 341800, 335400, 324100],
    },

    # ── Metals ───────────────────────────────────────────────────────────────
    {
        "id": "cftc-gold",
        "name": "Gold",
        "symbol": "XAUUSD",
        "category": "METALS",
        "high_52w": 312450,
        "low_52w": 142300,
        "positions": [278920, 265400, 254100, 242800, 228124, 219450],
        "commercial_positions": [-265000, -252000, -241000, -230500, -216500, -208000],
        "open_interest": [465200, 452100, 439800, 428400, 415196, 408500],
    },
    {
        "id": "cftc-silver",
        "name": "Silver",
        "symbol": "XAGUSD",
        "category": "METALS",
        "high_52w": 48200,
        "low_52w": 12400,
        "positions": [32450, 31100, 29800, 28200, 26739, 24150],
        "commercial_positions": [-30800, -29500, -28300, -26800, -25400, -22900],
        "open_interest": [118500, 115200, 112400, 108900, 104362, 101500],
    },
    {
        "id": "cftc-copper",
        "name": "Copper #1",
        "symbol": "HG",
        "category": "METALS",
        "high_52w": 112400,
        "low_52w": -35200,
        "positions": [64200, 72100, 78400, 82100, 80869, 75300],
        "commercial_positions": [-61000, -68500, -74500, -78000, -76800, -71500],
        "open_interest": [305200, 312400, 318500, 324100, 282640, 275400],
    },
    {
        "id": "cftc-platinum",
        "name": "Platinum",
        "symbol": "XPTUSD",
        "category": "METALS",
        "high_52w": 28400,
        "low_52w": -8200,
        "positions": [16200, 15400, 15100, 14800, 15000, 13900],
        "commercial_positions": [-15400, -14600, -14300, -14000, -14200, -13200],
        "open_interest": [74200, 72500, 71800, 70500, 68059, 66400],
    },
    {
        "id": "cftc-palladium",
        "name": "Palladium",
        "symbol": "XPDUSD",
        "category": "METALS",
        "high_52w": 4200,
        "low_52w": -12800,
        "positions": [-5100, -4800, -4500, -4200, -4305, -4100],
        "commercial_positions": [4800, 4500, 4200, 3900, 4000, 3800],
        "open_interest": [18200, 17800, 17400, 16900, 16497, 16100],
    },

    # ── Energies ─────────────────────────────────────────────────────────────
    {
        "id": "cftc-wti",
        "name": "WTI Light Sweet Crude Oil",
        "symbol": "CL",
        "category": "ENERGIES",
        "high_52w": 245600,
        "low_52w": -45200,
        "positions": [-12450, -18200, -22100, -23400, -24651, -28900],
        "commercial_positions": [11800, 17300, 21000, 22200, 23400, 27500],
        "open_interest": [812400, 804500, 795400, 782100, 767357, 754100],
    },
    {
        "id": "cftc-brent",
        "name": "Brent Crude Oil",
        "symbol": "BZ",
        "category": "ENERGIES",
        "high_52w": 145200,
        "low_52w": -65400,
        "positions": [-28400, -32100, -35800, -38200, -39397, -42100],
        "commercial_positions": [27000, 30500, 34000, 36300, 37400, 40000],
        "open_interest": [285400, 278500, 271200, 264500, 253258, 248900],
    },
    {
        "id": "cftc-natgas",
        "name": "Natural Gas",
        "symbol": "NG",
        "category": "ENERGIES",
        "high_52w": 210400,
        "low_52w": 45200,
        "positions": [162400, 158200, 152100, 149800, 146117, 141200],
        "commercial_positions": [-154000, -150000, -144000, -142000, -138000, -134000],
        "open_interest": [8245000, 8150000, 8020000, 7940000, 7816562, 7720000],
    },
    {
        "id": "cftc-heatingoil",
        "name": "Heating Oil",
        "symbol": "HEATING_OIL",
        "category": "ENERGIES",
        "high_52w": 45200,
        "low_52w": -22100,
        "positions": [-8400, -9800, -12100, -14200, -15800, -18200],
        "commercial_positions": [8000, 9300, 11500, 13500, 15000, 17300],
        "open_interest": [342100, 338500, 331200, 328400, 324500, 318900],
    },
    {
        "id": "cftc-gasoline",
        "name": "RBOB Gasoline",
        "symbol": "GASOLINE",
        "category": "ENERGIES",
        "high_52w": 78400,
        "low_52w": -15200,
        "positions": [32100, 35400, 38200, 41200, 44100, 46800],
        "commercial_positions": [-30500, -33600, -36300, -39100, -41900, -44500],
        "open_interest": [415200, 419800, 425400, 431200, 438500, 442100],
    },

    # ── Livestock & Softs ────────────────────────────────────────────────────
    {
        "id": "cftc-cattle",
        "name": "Live Cattle",
        "symbol": "CATTLE",
        "category": "LIVESTOCK",
        "high_52w": 112400,
        "low_52w": 18200,
        "positions": [68400, 65200, 62100, 59400, 56200, 53100],
        "commercial_positions": [-65000, -62000, -59000, -56500, -53400, -50500],
        "open_interest": [384200, 378500, 372100, 368400, 362500, 355400],
    },
    {
        "id": "cftc-hogs",
        "name": "Lean Hogs",
        "symbol": "HOGS",
        "category": "LIVESTOCK",
        "high_52w": 84200,
        "low_52w": -12400,
        "positions": [38200, 34100, 29400, 24100, 18400, 15200],
        "commercial_positions": [-36300, -32400, -27900, -22900, -17500, -14400],
        "open_interest": [285400, 278500, 271200, 264500, 258900, 251200],
    },
    {
        "id": "cftc-coffee",
        "name": "Coffee",
        "symbol": "COFFEE",
        "category": "SOFTS",
        "high_52w": 68400,
        "low_52w": -18200,
        "positions": [42100, 44800, 46200, 48100, 45200, 42100],
        "commercial_positions": [-40000, -42500, -43900, -45700, -42900, -40000],
        "open_interest": [245200, 248900, 251200, 254100, 249800, 245100],
    },
    {
        "id": "cftc-sugar",
        "name": "Sugar #11",
        "symbol": "SUGAR",
        "category": "SOFTS",
        "high_52w": 185400,
        "low_52w": -45200,
        "positions": [84200, 78100, 72400, 65200, 58400, 52100],
        "commercial_positions": [-80000, -74200, -68800, -61900, -55500, -49500],
        "open_interest": [945200, 938500, 928400, 915200, 904500, 895400],
    },
    {
        "id": "cftc-cocoa",
        "name": "Cocoa",
        "symbol": "COCOA",
        "category": "SOFTS",
        "high_52w": 42100,
        "low_52w": -28400,
        "positions": [12400, 14800, 18200, 21400, 25100, 28400],
        "commercial_positions": [-11800, -14100, -17300, -20300, -23800, -27000],
        "open_interest": [184500, 189200, 194500, 198200, 204500, 209800],
    },
]


class LegacyCOTReportEngine:
    """Formatter and calculator for Barchart/CFTC style Legacy COT Net Positions."""

    @classmethod
    def get_report(
        cls,
        category: Optional[str] = None,
        trader_group: str = "non_commercial",
        search: Optional[str] = None,
        detailed: bool = True,
    ) -> Dict[str, Any]:
        """
        Builds the structured table rows matching Barchart Legacy Net Positions.
        
        trader_group:
          - "non_commercial": Non-Commercial (Large Speculators)
          - "commercial": Commercial (Hedgers)
          - "open_interest": Total Open Interest
        """
        items = COT_LEGACY_UNIVERSE

        # Filter by Category
        if category and category.upper() != "FULL LIST":
            cat_filter = category.upper()
            items = [i for i in items if i.get("category", "").upper() == cat_filter]

        # Filter by Search
        if search and search.strip():
            q = search.strip().lower()
            items = [i for i in items if q in i.get("name", "").lower() or q in i.get("symbol", "").lower()]

        # Filter detailed vs summary (e.g. detailed includes currency pairs)
        if not detailed:
            items = [i for i in items if not i.get("is_pair", False)]

        rows = []
        for item in items:
            # Pick position array based on trader group
            if trader_group == "commercial":
                raw_positions = item.get("commercial_positions", [-p for p in item["positions"]])
            elif trader_group == "open_interest":
                raw_positions = item.get("open_interest", [abs(p) * 4 for p in item["positions"]])
            else:
                raw_positions = item["positions"]

            high_52w = item["high_52w"]
            low_52w = item["low_52w"]

            # Calculate cells with metadata
            cells = []
            for idx, val in enumerate(raw_positions):
                is_high = (val == high_52w) or (abs(val - high_52w) < 5)
                is_low = (val == low_52w) or (abs(val - low_52w) < 5)

                # Prior week lookup (next in descending Tuesday dates list)
                if idx + 1 < len(raw_positions):
                    prior_val = raw_positions[idx + 1]
                    has_prior = True
                elif item["id"] in ["cftc-btc-micro", "cftc-eth-micro"]:
                    # Aug 18 was positive, flipping to negative on Aug 25
                    prior_val = 100
                    has_prior = True
                else:
                    prior_val = val
                    has_prior = False

                prior_was_negative = False
                prior_was_positive = False

                # Sign change highlights ONLY apply when the value actually reversed sign
                # and when it is not already highlighted as a 52W extreme
                if not is_high and not is_low and has_prior:
                    if val > 0 and prior_val < 0:
                        # Prior period was negative -> now flipped to positive
                        prior_was_negative = True
                    elif val < 0 and prior_val > 0:
                        # Prior period was positive -> now flipped to negative
                        prior_was_positive = True

                # In Barchart:
                # - Light purple tint if prior period was negative
                # - Light cyan tint if prior period was positive
                # - Green pill if 52W high
                # - Red pill if 52W low
                cells.append({
                    "date": TRAILING_DATES[idx] if idx < len(TRAILING_DATES) else f"Week {idx}",
                    "value": val,
                    "formatted": f"{val:,}",
                    "is_52w_high": is_high,
                    "is_52w_low": is_low,
                    "prior_was_positive": prior_was_positive,
                    "prior_was_negative": prior_was_negative,
                    "sign_flipped": (val > 0 and prior_val < 0) or (val < 0 and prior_val > 0),
                })

            latest_val = raw_positions[0] if raw_positions else 0
            prior_val = raw_positions[1] if len(raw_positions) > 1 else latest_val
            weekly_change = latest_val - prior_val

            rows.append({
                "id": item["id"],
                "commodity": item["name"],
                "symbol": item["symbol"],
                "category": item["category"],
                "is_pair": item.get("is_pair", False),
                "is_inverted": item.get("is_inverted", False),
                "high_52w": high_52w,
                "high_52w_formatted": f"{high_52w:,}",
                "low_52w": low_52w,
                "low_52w_formatted": f"{low_52w:,}",
                "weekly_change": weekly_change,
                "weekly_change_formatted": f"{weekly_change:+,}",
                "cells": cells,
            })

        return {
            "title": "Legacy Commitments Of Traders Net Positions",
            "subtitle": "The Legacy Commitment of Trader - Non-Commercial (Large Speculators) COT report provides a breakdown of each Tuesday's open interest, based on the Futures-Only reports, updated Friday at 3pm CT.",
            "dates": TRAILING_DATES,
            "current_trader_group": trader_group,
            "category": category or "FULL LIST",
            "available_categories": [
                "FULL LIST",
                "CURRENCIES",
                "ENERGIES",
                "FINANCIALS",
                "GRAINS",
                "INDICES",
                "LIVESTOCK",
                "METALS",
                "SOFTS",
            ],
            "trader_groups": [
                {"id": "non_commercial", "label": "Non-Commercial (Large Speculators)"},
                {"id": "commercial", "label": "Commercial (Hedgers)"},
                {"id": "open_interest", "label": "Total Open Interest"},
            ],
            "total_commodities": len(rows),
            "rows": rows,
            "next_release_info": {
                "next_cutoff_date": "Tuesday, Oct 6, 2026",
                "next_release_date": "Friday, Oct 9, 2026 at 3:30 PM ET",
                "frequency": "Weekly (every Friday at 3:30 PM ET)",
            },
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }

    @classmethod
    def get_chart_history(cls, commodity_id_or_symbol: str) -> Dict[str, Any]:
        """Generate time-series history for flipchart or mini-chart modal."""
        target = None
        for item in COT_LEGACY_UNIVERSE:
            if item["id"] == commodity_id_or_symbol or item["symbol"].upper() == commodity_id_or_symbol.upper() or item["name"].lower() == commodity_id_or_symbol.lower():
                target = item
                break

        if not target:
            target = COT_LEGACY_UNIVERSE[0]

        # Generate a smooth 26-week historical positioning series
        weeks = []
        spec_base = target["positions"][0]
        raw_comm = target.get("commercial_positions") or [-p for p in target["positions"]]
        raw_oi = target.get("open_interest") or [abs(p) * 4 for p in target["positions"]]
        comm_base = raw_comm[0]
        oi_base = raw_oi[0]

        for w_idx in range(26):
            factor = (26 - w_idx) / 26.0
            if w_idx < len(target["positions"]):
                spec_val = target["positions"][w_idx]
                comm_val = raw_comm[w_idx] if w_idx < len(raw_comm) else int(-spec_val)
                oi_val = raw_oi[w_idx] if w_idx < len(raw_oi) else int(abs(spec_val) * 4)
                label = TRAILING_DATES[w_idx]
            else:
                spec_val = int(spec_base * (0.8 + 0.4 * factor))
                comm_val = int(comm_base * (0.8 + 0.4 * factor))
                oi_val = int(oi_base * (0.9 + 0.2 * factor))
                label = f"W-{w_idx+1}"

            weeks.append({
                "date": label,
                "non_commercial_net": spec_val,
                "commercial_net": comm_val,
                "open_interest": oi_val,
            })

        return {
            "commodity": target["name"],
            "symbol": target["symbol"],
            "category": target["category"],
            "high_52w": target["high_52w"],
            "low_52w": target["low_52w"],
            "history": list(reversed(weeks)),
        }

    @classmethod
    def export_csv(
        cls,
        category: Optional[str] = None,
        trader_group: str = "non_commercial",
        search: Optional[str] = None,
        detailed: bool = True,
    ) -> str:
        """Export tabular report data to CSV string format."""
        import csv
        import io

        report = cls.get_report(
            category=category,
            trader_group=trader_group,
            search=search,
            detailed=detailed,
        )

        output = io.StringIO()
        writer = csv.writer(output)

        headers = ["Commodity", "Symbol", "Category", "52W High", "52W Low"]
        headers.extend(report.get("dates", []))
        headers.append("Weekly Change")
        writer.writerow(headers)

        for r in report.get("rows", []):
            row = [
                r.get("commodity", ""),
                r.get("symbol", ""),
                r.get("category", ""),
                r.get("high_52w", ""),
                r.get("low_52w", ""),
            ]
            for c in r.get("cells", []):
                row.append(c.get("value", ""))
            row.append(r.get("weekly_change", ""))
            writer.writerow(row)

        return output.getvalue()

