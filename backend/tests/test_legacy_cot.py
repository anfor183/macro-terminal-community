"""Unit tests for Legacy Commitments of Traders (COT) Report Engine."""

import pytest
from backend.app.engine.legacy_cot_report import LegacyCOTReportEngine, COT_LEGACY_UNIVERSE


class TestLegacyCOTReportEngine:

    def test_cell_highlight_accuracy(self):
        report = LegacyCOTReportEngine.get_report(category="CURRENCIES")
        
        # 1. U.S. Dollar Index: all positive, no 52W extremes -> NO highlights
        dxy = next(r for r in report["rows"] if r["symbol"] == "DXY")
        for c in dxy["cells"]:
            assert not c["is_52w_high"]
            assert not c["is_52w_low"]
            assert not c["prior_was_negative"]
            assert not c["prior_was_positive"]

        # 2. Japanese Yen: Sep 15 is 52W High, Sep 8 is prior_was_negative (flipped from negative to positive)
        jpy = next(r for r in report["rows"] if r["symbol"] == "JPY")
        assert jpy["cells"][2]["is_52w_high"]  # Sep 15
        assert jpy["cells"][3]["prior_was_negative"]  # Sep 8
        assert not jpy["cells"][0]["prior_was_positive"]  # Sep 29 normal

        # 3. Mexican Peso: Sep 29 is 52W Low
        mxn = next(r for r in report["rows"] if r["symbol"] == "MXN")
        assert mxn["cells"][0]["is_52w_low"]
        assert not mxn["cells"][1]["is_52w_low"]

    def test_universe_loaded(self):
        assert len(COT_LEGACY_UNIVERSE) > 30

    def test_full_list_report(self):
        report = LegacyCOTReportEngine.get_report()
        assert report["title"] == "Legacy Commitments Of Traders Net Positions"
        assert len(report["dates"]) == 6
        assert len(report["rows"]) > 30
        assert "CURRENCIES" in report["available_categories"]

    def test_currencies_filtering(self):
        report = LegacyCOTReportEngine.get_report(category="CURRENCIES")
        assert len(report["rows"]) >= 10
        for r in report["rows"]:
            assert r["category"] == "CURRENCIES"

    def test_search_filter(self):
        report = LegacyCOTReportEngine.get_report(search="Pound")
        assert len(report["rows"]) >= 1
        commodities = [r["commodity"] for r in report["rows"]]
        assert any("Pound" in c for c in commodities)

    def test_trader_groups(self):
        for tg in ["non_commercial", "commercial", "open_interest"]:
            report = LegacyCOTReportEngine.get_report(category="GRAINS", trader_group=tg)
            assert report["current_trader_group"] == tg
            assert len(report["rows"]) >= 5

    def test_cell_metadata_and_flags(self):
        report = LegacyCOTReportEngine.get_report(category="CURRENCIES")
        for row in report["rows"]:
            assert len(row["cells"]) == 6
            for cell in row["cells"]:
                assert "value" in cell
                assert "formatted" in cell
                assert "is_52w_high" in cell
                assert "is_52w_low" in cell
                assert "prior_was_positive" in cell
                assert "prior_was_negative" in cell

    def test_chart_history(self):
        chart = LegacyCOTReportEngine.get_chart_history("EURUSD")
        assert chart["symbol"] is not None
        assert len(chart["history"]) == 26
        for point in chart["history"]:
            assert "date" in point
            assert "non_commercial_net" in point
            assert "commercial_net" in point

    def test_csv_export(self):
        csv_str = LegacyCOTReportEngine.export_csv(category="ENERGIES")
        lines = csv_str.strip().splitlines()
        assert len(lines) >= 2
        assert "Commodity" in lines[0]
        assert "Weekly Change" in lines[0]

from backend.app.engine.cot_index_engine import COTIndexEngine, COT_MARKETS


class TestCOTIndexEngine:
    def test_supported_markets(self):
        markets = COTIndexEngine.get_supported_markets()
        assert len(markets) >= 15
        jpy = next(m for m in markets if m["symbol"] == "JPY")
        assert jpy["cftc_code"] == "097741"
        assert jpy["exchange"] == "Chicago Mercantile Exchange"

    def test_popular_tickers(self):
        pop = COTIndexEngine.get_popular_tickers()
        assert "JPY" in pop
        assert "GOLD" in pop
        assert "ES" in pop

    def test_cot_index_bounds(self):
        idx_zero = COTIndexEngine.calculate_cot_index(10, 10, 100)
        assert idx_zero == 0.0
        idx_max = COTIndexEngine.calculate_cot_index(100, 10, 100)
        assert idx_max == 100.0
        idx_mid = COTIndexEngine.calculate_cot_index(55, 10, 100)
        assert idx_mid == 50.0

    def test_jpy_52w_non_commercial_chart(self):
        chart = COTIndexEngine.get_chart_data(symbol="JPY", timeframe="52W", trader_group="non_commercial")
        assert chart["market"]["symbol"] == "JPY"
        assert len(chart["history"]) == 52
        for pt in chart["history"]:
            assert 0.0 <= pt["cot_index"] <= 100.0
            assert "price" in pt
            assert "open_interest" in pt

    def test_jpy_commercial_mirrored(self):
        chart_spec = COTIndexEngine.get_chart_data(symbol="JPY", timeframe="52W", trader_group="non_commercial")
        chart_comm = COTIndexEngine.get_chart_data(symbol="JPY", timeframe="52W", trader_group="commercial")
        # Speculator and Commercial should move inversely
        spec_last = chart_spec["current_summary"]["cot_index"]
        comm_last = chart_comm["current_summary"]["cot_index"]
        assert abs(spec_last - comm_last) > 10.0  # Divergent

    def test_multi_timeframes(self):
        for tf, expected_len in [("26W", 26), ("52W", 52), ("156W", 156), ("260W", 260)]:
            res = COTIndexEngine.get_chart_data(symbol="GOLD", timeframe=tf)
            assert len(res["history"]) == expected_len



    def test_nzd_112741_resolution_and_chart(self):
        chart = COTIndexEngine.get_chart_data(symbol="112741", timeframe="52W", trader_group="non_commercial")
        assert chart["market"]["cftc_code"] == "112741"
        assert "NEW ZEALAND DOLLAR" in chart["market"]["name"]
        assert chart["market"]["ticker"] == "6N"
        assert chart["market"]["category"] == "Currencies & Forex"
        assert chart["market"]["subcategory"] == "Major Currencies & Indices"
        assert len(chart["history"]) == 52
        for pt in chart["history"]:
            assert 0.0 <= pt["cot_index"] <= 100.0

    def test_categories_hierarchy_10_categories(self):
        cats = COTIndexEngine.get_categories_hierarchy()
        assert len(cats) == 10
        cat_names = [c["name"] for c in cats]
        assert "Currencies & Forex" in cat_names
        assert "Stock Indices & Equities" in cat_names
        assert "Energy" in cat_names
        assert "Metals" in cat_names
        assert "Agriculture & Food" in cat_names
        assert "Interest Rates & Bonds" in cat_names
        assert "Cryptocurrencies" in cat_names

    def test_extreme_zones_classification(self):
        chart = COTIndexEngine.get_chart_data(symbol="112741", timeframe="52W", trader_group="non_commercial")
        for pt in chart["history"]:
            if pt["cot_index"] >= 80:
                assert pt["is_extreme_long"] is True
                assert pt["zone_label"] == "Extreme long (>80)"
            elif pt["cot_index"] <= 20:
                assert pt["is_extreme_short"] is True
                assert pt["zone_label"] == "Extreme short (<20)"
            else:
                assert pt["is_extreme_long"] is False
                assert pt["is_extreme_short"] is False
                assert pt["zone_label"] == "Neutral"
