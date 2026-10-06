import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Download,
  Calendar,
  LineChart,
  HelpCircle,
  Search,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  X,
  Layers,
  Table,
  Sliders,
  Info,
  SlidersHorizontal,
  ExternalLink,
} from 'lucide-react';
import { api } from '../services/api';
import {
  LegacyCOTReportResponse,
  COTReportRow,
  COTIndexChartResponse,
  COTMarketInfo,
  COTCategoryItem,
} from '../types/macro';

interface COTReportViewProps {
  onSelectAsset?: (symbol: string) => void;
}

const formatPriceValue = (val: number | undefined | null): string => {
  if (val === undefined || val === null || isNaN(val)) return '-';
  if (val >= 1000) {
    return val.toLocaleString(undefined, {
      minimumFractionDigits: 1,
      maximumFractionDigits: 2,
    });
  }
  if (val >= 10) {
    return val.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }
  if (val >= 1) {
    return val.toFixed(2);
  }
  return val.toFixed(4);
};

export const COTReportView: React.FC<COTReportViewProps> = ({ onSelectAsset }) => {
  // Navigation View Mode: 'studio' (cot-reports.com graphics), 'table' (legacy grid), 'both'
  const [viewMode, setViewMode] = useState<'both' | 'studio' | 'table'>('both');

  // ── COT Index Studio State (cot-reports.com style) ─────────────────────────
  // Read initial market from URL query param ?m=112741 if present
  const getInitialMarket = (): string => {
    try {
      const params = new URLSearchParams(window.location.search);
      const mParam = params.get('m');
      if (mParam && mParam.trim()) {
        return mParam.trim();
      }
    } catch {
      // Fallback
    }
    return 'JPY';
  };

  const [activeSymbol, setActiveSymbol] = useState<string>(getInitialMarket);
  const [timeframe, setTimeframe] = useState<string>('52W');
  const [traderCategory, setTraderCategory] = useState<string>('non_commercial'); // 'non_commercial', 'commercial', 'non_reportable'
  const [marketSearch, setMarketSearch] = useState<string>('');
  const [marketsList, setMarketsList] = useState<COTMarketInfo[]>([]);
  const [categoriesTree, setCategoriesTree] = useState<COTCategoryItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('Currencies & Forex');
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>('Major Currencies & Indices');
  const [popularTickers, setPopularTickers] = useState<string[]>([
    'EUR', 'GBP', 'JPY', 'CHF', 'CAD', 'AUD', 'NZD', 'USD',
    'GOLD', 'SILVER', 'OIL', 'GAS', 'ES', 'NQ', 'BTC', 'ETH'
  ]);
  const [chartData, setChartData] = useState<COTIndexChartResponse | null>(null);
  const [chartLoading, setChartLoading] = useState<boolean>(true);

  // SVG Chart hover tooltip state
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  // ── Legacy Net Positions Table State (Barchart style) ───────────────────────
  const [tableCategory, setTableCategory] = useState<string>('FULL LIST');
  const [tableTraderGroup, setTableTraderGroup] = useState<string>('non_commercial');
  const [tableDetailed, setTableDetailed] = useState<boolean>(true);
  const [tableSearch, setTableSearch] = useState<string>('');
  const [legacyData, setLegacyData] = useState<LegacyCOTReportResponse | null>(null);
  const [legacyLoading, setLegacyLoading] = useState<boolean>(true);
  const [nextDatesOpen, setNextDatesOpen] = useState<boolean>(false);
  const [helpOpen, setHelpOpen] = useState<boolean>(false);

  // Load Markets Catalog & Categories Hierarchy
  useEffect(() => {
    api.getCOTIndexMarkets()
      .then((res) => {
        if (res.markets && res.markets.length > 0) {
          setMarketsList(res.markets);
        }
        if (res.popular) {
          setPopularTickers(res.popular);
        }
        if (res.categories && res.categories.length > 0) {
          setCategoriesTree(res.categories);
        }
      })
      .catch((err) => console.error('Failed to load COT markets', err));
  }, []);

  // Update URL parameter ?m=... whenever active market changes
  useEffect(() => {
    try {
      const url = new URL(window.location.href);
      const currentParam = activeMarket?.cftc_code || activeSymbol;
      if (url.searchParams.get('m') !== currentParam) {
        url.searchParams.set('m', currentParam);
        window.history.replaceState({}, '', url.toString());
      }
    } catch {
      // Ignored in non-browser context
    }
  }, [activeSymbol, chartData]);

  // Load COT Index Chart Data
  const loadChartData = () => {
    setChartLoading(true);
    api.getCOTIndexChart({
      symbol: activeSymbol,
      timeframe,
      trader_group: traderCategory,
    })
      .then((res) => {
        setChartData(res);
        // Automatically sync category and subcategory selectors to returned market
        if (res.market) {
          if (res.market.category) setSelectedCategory(res.market.category);
          if (res.market.subcategory) setSelectedSubcategory(res.market.subcategory);
        }
        if (res.categories && res.categories.length > 0) {
          setCategoriesTree(res.categories);
        }
      })
      .catch((err) => console.error('Failed to load COT Index Chart', err))
      .finally(() => setChartLoading(false));
  };

  useEffect(() => {
    loadChartData();
  }, [activeSymbol, timeframe, traderCategory]);

  // Load Legacy Report Table
  const loadLegacyTable = () => {
    setLegacyLoading(true);
    api.getLegacyCOTReport({
      category: tableCategory,
      trader_group: tableTraderGroup,
      search: tableSearch,
      detailed: tableDetailed,
    })
      .then((res) => {
        setLegacyData(res);
      })
      .catch((err) => console.error('Failed to load Legacy COT Report', err))
      .finally(() => setLegacyLoading(false));
  };

  useEffect(() => {
    loadLegacyTable();
  }, [tableCategory, tableTraderGroup, tableDetailed, tableSearch]);

  // Categories list for Table
  const categories = useMemo(
    () => [
      'FULL LIST',
      'CURRENCIES',
      'ENERGIES',
      'FINANCIALS',
      'GRAINS',
      'INDICES',
      'LIVESTOCK',
      'METALS',
      'SOFTS',
    ],
    []
  );

  // Find active market metadata
  const activeMarket = useMemo(() => {
    const q = activeSymbol.trim().toUpperCase();
    const found =
      marketsList.find(
        (m) =>
          m.cftc_code === q ||
          m.symbol.toUpperCase() === q ||
          m.ticker.toUpperCase() === q ||
          m.name.toUpperCase() === q
      ) ||
      chartData?.market || {
        symbol: activeSymbol,
        ticker: activeSymbol,
        name: activeSymbol,
        full_name: `${activeSymbol} Futures`,
        exchange: 'Chicago Mercantile Exchange',
        cftc_code: '112741',
        category: selectedCategory,
        subcategory: selectedSubcategory,
        contract_units: '',
      };
    return found;
  }, [marketsList, activeSymbol, chartData, selectedCategory, selectedSubcategory]);

  // Available Subcategories for the selected Category
  const availableSubcategories = useMemo(() => {
    const catObj = categoriesTree.find((c) => c.name === selectedCategory);
    if (catObj && catObj.subcategories) {
      return catObj.subcategories.map((s) => s.name);
    }
    // Fallback default subcategories if categoriesTree not loaded yet
    const subSet = new Set<string>();
    marketsList
      .filter((m) => m.category === selectedCategory)
      .forEach((m) => {
        if (m.subcategory) subSet.add(m.subcategory);
      });
    return Array.from(subSet);
  }, [categoriesTree, selectedCategory, marketsList]);

  // Available Markets in the selected Category & Subcategory
  const availableMarkets = useMemo(() => {
    if (marketSearch.trim()) {
      const q = marketSearch.toLowerCase().trim();
      return marketsList.filter(
        (m) =>
          m.name.toLowerCase().includes(q) ||
          m.ticker.toLowerCase().includes(q) ||
          m.symbol.toLowerCase().includes(q) ||
          m.cftc_code.includes(q) ||
          (m.category && m.category.toLowerCase().includes(q))
      );
    }
    return marketsList.filter(
      (m) =>
        m.category === selectedCategory &&
        m.subcategory === selectedSubcategory
    );
  }, [marketsList, selectedCategory, selectedSubcategory, marketSearch]);

  // Grouped sections for Legacy Table
  const groupedSections = useMemo(() => {
    if (!legacyData?.rows) return [];
    if (tableCategory !== 'FULL LIST') {
      return [{ categoryName: tableCategory, rows: legacyData.rows }];
    }
    const map = new Map<string, COTReportRow[]>();
    for (const row of legacyData.rows) {
      const cat = row.category || 'OTHER';
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(row);
    }
    return Array.from(map.entries()).map(([categoryName, rows]) => ({
      categoryName,
      rows,
    }));
  }, [legacyData, tableCategory]);

  // Styling helper for table cells
  const getCellHighlightStyle = (cell: any) => {
    if (cell.is_52w_high) {
      return {
        background: 'rgba(34, 197, 94, 0.22)',
        color: '#4ade80',
        fontWeight: 700,
        borderRadius: 3,
      };
    }
    if (cell.is_52w_low) {
      return {
        background: 'rgba(239, 68, 68, 0.22)',
        color: '#f87171',
        fontWeight: 700,
        borderRadius: 3,
      };
    }
    if (cell.prior_was_negative) {
      return {
        background: 'rgba(168, 85, 247, 0.22)',
        color: '#c084fc',
        fontWeight: 600,
        borderRadius: 3,
      };
    }
    if (cell.prior_was_positive) {
      return {
        background: 'rgba(14, 165, 233, 0.22)',
        color: '#38bdf8',
        fontWeight: 600,
        borderRadius: 3,
      };
    }
    return {
      color: 'var(--text-primary)',
    };
  };

  // CSV download
  const handleExportCSV = () => {
    const url = `/api/v1/cot/legacy/export?category=${encodeURIComponent(
      tableCategory
    )}&trader_group=${encodeURIComponent(tableTraderGroup)}&detailed=${tableDetailed}`;
    window.open(url, '_blank');
  };

  // Mouse hover calculation for interactive SVG chart
  const handleSvgMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current || !chartData?.history?.length) return;
    const rect = svgRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const width = rect.width;
    const ratio = Math.max(0, Math.min(1, x / width));
    const idx = Math.round(ratio * (chartData.history.length - 1));
    setHoverIndex(idx);
  };

  const hoveredPoint = useMemo(() => {
    if (!chartData?.history?.length) return null;
    if (hoverIndex !== null && chartData.history[hoverIndex]) {
      return chartData.history[hoverIndex];
    }
    return chartData.history[chartData.history.length - 1];
  }, [chartData, hoverIndex]);

  // Color selection based on Trader Category
  const categoryAccentColor = useMemo(() => {
    if (traderCategory === 'commercial') return '#3b82f6'; // Royal blue
    if (traderCategory === 'non_reportable') return '#94a3b8'; // Slate grey
    return '#14b8a6'; // Emerald/Teal for Non-Commercial Speculators
  }, [traderCategory]);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 20,
        paddingBottom: 50,
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      }}
    >
      {/* ── Studio Navigation & View Mode Switcher ─────────────────────────── */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12,
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          paddingBottom: 12,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              background: 'linear-gradient(135deg, rgba(20, 184, 166, 0.25) 0%, rgba(15, 23, 42, 0.6) 100%)',
              border: '1px solid rgba(20, 184, 166, 0.4)',
              padding: '5px 12px',
              borderRadius: 6,
            }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: '#14b8a6',
                boxShadow: '0 0 8px #14b8a6',
                display: 'inline-block',
              }}
            />
            <span
              style={{
                fontSize: '0.85rem',
                fontWeight: 900,
                color: '#2dd4bf',
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
              }}
            >
              COT Intelligence Terminal
            </span>
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            CFTC Futures-Only · Universal Legacy Taxonomy · Larry Williams COT Index
          </span>
        </div>

        {/* View Mode Toggle: Both, Studio, Grid */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            background: 'var(--surface-1)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 6,
            padding: 3,
            gap: 2,
          }}
        >
          <button
            onClick={() => setViewMode('studio')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              background: viewMode === 'studio' ? 'rgba(20, 184, 166, 0.2)' : 'transparent',
              border: viewMode === 'studio' ? '1px solid rgba(20, 184, 166, 0.5)' : '1px solid transparent',
              color: viewMode === 'studio' ? '#2dd4bf' : 'var(--text-secondary)',
              fontSize: '0.78rem',
              fontWeight: viewMode === 'studio' ? 700 : 500,
              padding: '5px 12px',
              borderRadius: 4,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <LineChart size={14} />
            COT Index Studio
          </button>
          <button
            onClick={() => setViewMode('table')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              background: viewMode === 'table' ? 'rgba(20, 184, 166, 0.2)' : 'transparent',
              border: viewMode === 'table' ? '1px solid rgba(20, 184, 166, 0.5)' : '1px solid transparent',
              color: viewMode === 'table' ? '#2dd4bf' : 'var(--text-secondary)',
              fontSize: '0.78rem',
              fontWeight: viewMode === 'table' ? 700 : 500,
              padding: '5px 12px',
              borderRadius: 4,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <Table size={14} />
            Legacy Grid
          </button>
          <button
            onClick={() => setViewMode('both')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              background: viewMode === 'both' ? 'rgba(20, 184, 166, 0.2)' : 'transparent',
              border: viewMode === 'both' ? '1px solid rgba(20, 184, 166, 0.5)' : '1px solid transparent',
              color: viewMode === 'both' ? '#2dd4bf' : 'var(--text-secondary)',
              fontSize: '0.78rem',
              fontWeight: viewMode === 'both' ? 700 : 500,
              padding: '5px 12px',
              borderRadius: 4,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <Layers size={14} />
            Full Terminal (Split)
          </button>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          SECTION 1: COT INDEX STUDIO (cot-reports.com Graphics Design)
      ══════════════════════════════════════════════════════════════════════════ */}
      {(viewMode === 'studio' || viewMode === 'both') && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* ── Configuration Parameters Card (Matching cot-reports.com) ────────── */}
          <div
            style={{
              background: 'linear-gradient(180deg, #090e17 0%, #0c1424 100%)',
              border: '1px solid rgba(30, 58, 138, 0.35)',
              borderRadius: 8,
              padding: '16px 20px',
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
              display: 'flex',
              flexDirection: 'column',
              gap: 14,
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                fontSize: '0.8rem',
                color: '#64748b',
                fontWeight: 600,
              }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: '#14b8a6',
                }}
              />
              Configure your COT Report analysis parameters below
            </div>

            {/* Dropdown Selectors Grid */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: 16,
              }}
            >
              {/* Category & Subcategory Selectors */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label
                  style={{
                    fontSize: '0.72rem',
                    fontWeight: 800,
                    color: '#94a3b8',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                  }}
                >
                  CATEGORY & SUBCATEGORY
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {/* Category Dropdown */}
                  <select
                    value={selectedCategory}
                    onChange={(e) => {
                      const newCat = e.target.value;
                      setSelectedCategory(newCat);
                      // Pick first subcategory in new category
                      const catObj = categoriesTree.find((c) => c.name === newCat);
                      if (catObj && catObj.subcategories.length > 0) {
                        const firstSub = catObj.subcategories[0].name;
                        setSelectedSubcategory(firstSub);
                        if (catObj.subcategories[0].markets.length > 0) {
                          setActiveSymbol(catObj.subcategories[0].markets[0].symbol);
                        }
                      } else {
                        // Fallback from marketsList
                        const sub = marketsList.find((m) => m.category === newCat);
                        if (sub) {
                          setSelectedSubcategory(sub.subcategory);
                          setActiveSymbol(sub.symbol);
                        }
                      }
                    }}
                    style={{
                      background: '#0f172a',
                      border: '1px solid rgba(51, 65, 85, 0.8)',
                      color: '#e2e8f0',
                      borderRadius: 6,
                      padding: '8px 12px',
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      outline: 'none',
                    }}
                  >
                    {categoriesTree.length > 0
                      ? categoriesTree.map((c) => (
                          <option key={c.name} value={c.name}>
                            {c.name}
                          </option>
                        ))
                      : [
                          'Currencies & Forex',
                          'Stock Indices & Equities',
                          'Energy',
                          'Metals',
                          'Agriculture & Food',
                          'Interest Rates & Bonds',
                          'Cryptocurrencies',
                          'Carbon Credits & Green Energy',
                          'Electricity & Power',
                          'Other Markets',
                        ].map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                  </select>

                  {/* Subcategory Dropdown */}
                  <select
                    value={selectedSubcategory}
                    onChange={(e) => {
                      const newSub = e.target.value;
                      setSelectedSubcategory(newSub);
                      // Pick first market in this subcategory
                      const catObj = categoriesTree.find((c) => c.name === selectedCategory);
                      const subObj = catObj?.subcategories.find((s) => s.name === newSub);
                      if (subObj && subObj.markets.length > 0) {
                        setActiveSymbol(subObj.markets[0].symbol);
                      } else {
                        const mFound = marketsList.find(
                          (m) => m.category === selectedCategory && m.subcategory === newSub
                        );
                        if (mFound) setActiveSymbol(mFound.symbol);
                      }
                    }}
                    style={{
                      background: '#0f172a',
                      border: '1px solid rgba(51, 65, 85, 0.8)',
                      color: '#cbd5e1',
                      borderRadius: 6,
                      padding: '8px 12px',
                      fontSize: '0.82rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      outline: 'none',
                    }}
                  >
                    {availableSubcategories.map((sub) => (
                      <option key={sub} value={sub}>
                        {sub}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Contract & Market Selector */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label
                  style={{
                    fontSize: '0.72rem',
                    fontWeight: 800,
                    color: '#94a3b8',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                  }}
                >
                  CONTRACT & MARKET
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {/* Market Select dropdown */}
                  <select
                    value={activeMarket.cftc_code || activeSymbol}
                    onChange={(e) => {
                      const val = e.target.value;
                      const mFound = marketsList.find(
                        (m) => m.cftc_code === val || m.symbol === val || m.ticker === val
                      );
                      if (mFound) {
                        setActiveSymbol(mFound.symbol || mFound.cftc_code);
                        setSelectedCategory(mFound.category);
                        setSelectedSubcategory(mFound.subcategory);
                      } else {
                        setActiveSymbol(val);
                      }
                    }}
                    style={{
                      background: '#0f172a',
                      border: '1px solid rgba(51, 65, 85, 0.8)',
                      color: '#ffffff',
                      borderRadius: 6,
                      padding: '8px 12px',
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      outline: 'none',
                    }}
                  >
                    {availableMarkets.map((m) => (
                      <option key={`${m.cftc_code}-${m.ticker}`} value={m.cftc_code || m.symbol}>
                        {m.name} ({m.ticker})
                      </option>
                    ))}
                  </select>

                  {/* Market Search bar (filters across all 380 markets) */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      background: '#0f172a',
                      border: '1px solid rgba(51, 65, 85, 0.8)',
                      borderRadius: 6,
                      padding: '7px 12px',
                    }}
                  >
                    <Search size={14} color="#64748b" />
                    <input
                      type="text"
                      placeholder="Search markets by name, ticker, or CFTC code (e.g. 112741, NZD, Gold)..."
                      value={marketSearch}
                      onChange={(e) => setMarketSearch(e.target.value)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        outline: 'none',
                        color: '#f8fafc',
                        fontSize: '0.8rem',
                        width: '100%',
                      }}
                    />
                    {marketSearch && (
                      <button
                        onClick={() => setMarketSearch('')}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: '#64748b',
                          cursor: 'pointer',
                        }}
                      >
                        <X size={13} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Active Contract Info Tag (Matching cot-reports.com header) */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                flexWrap: 'wrap',
                fontSize: '0.78rem',
                color: '#94a3b8',
                fontWeight: 600,
                paddingTop: 6,
                borderTop: '1px solid rgba(255, 255, 255, 0.05)',
              }}
            >
              <span
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: '50%',
                  background: '#14b8a6',
                }}
              />
              <span style={{ color: '#f1f5f9', fontWeight: 800, letterSpacing: '0.02em' }}>
                {activeMarket.name}
              </span>
              <span
                style={{
                  background: 'rgba(56, 189, 248, 0.15)',
                  color: '#38bdf8',
                  padding: '1px 6px',
                  borderRadius: 4,
                  fontWeight: 700,
                  fontSize: '0.72rem',
                }}
              >
                {activeMarket.ticker}
              </span>
              <span style={{ color: '#94a3b8' }}>{activeMarket.exchange.toUpperCase()}</span>
              <span style={{ color: '#cbd5e1', fontWeight: 700 }}>
                CFTC: {activeMarket.cftc_code}
              </span>
              {activeMarket.contract_units && (
                <span style={{ color: '#64748b', fontSize: '0.74rem' }}>
                  ({activeMarket.contract_units})
                </span>
              )}
            </div>
          </div>

          {/* ── Popular Tickers Bar ─────────────────────────────────────────── */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              flexWrap: 'wrap',
              padding: '6px 4px',
            }}
          >
            <span
              style={{
                fontSize: '0.74rem',
                fontWeight: 800,
                color: '#64748b',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                marginRight: 2,
              }}
            >
              POPULAR:
            </span>
            {popularTickers.map((tick) => {
              const active =
                activeSymbol === tick ||
                activeMarket.symbol === tick ||
                activeMarket.ticker === tick;
              return (
                <button
                  key={tick}
                  onClick={() => {
                    setActiveSymbol(tick);
                    setMarketSearch('');
                  }}
                  style={{
                    background: active ? '#0d9488' : '#0f172a',
                    color: active ? '#ffffff' : '#94a3b8',
                    border: active
                      ? '1px solid #14b8a6'
                      : '1px solid rgba(51, 65, 85, 0.7)',
                    padding: '4px 10px',
                    borderRadius: 4,
                    fontSize: '0.72rem',
                    fontWeight: active ? 800 : 600,
                    cursor: 'pointer',
                    boxShadow: active ? '0 0 10px rgba(20, 184, 166, 0.45)' : 'none',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    if (!active) {
                      e.currentTarget.style.color = '#f1f5f9';
                      e.currentTarget.style.borderColor = '#64748b';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!active) {
                      e.currentTarget.style.color = '#94a3b8';
                      e.currentTarget.style.borderColor = 'rgba(51, 65, 85, 0.7)';
                    }
                  }}
                >
                  {tick}
                </button>
              );
            })}
            <button
              onClick={() => {
                setActiveSymbol('JPY');
                setMarketSearch('');
              }}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#64748b',
                fontSize: '0.72rem',
                cursor: 'pointer',
                marginLeft: 4,
              }}
            >
              ✕ Clear
            </button>
          </div>

          {/* ── Trader Category Selector Bar ───────────────────────────────── */}
          <div
            style={{
              background: 'linear-gradient(180deg, #090e17 0%, #0c1424 100%)',
              border: '1px solid rgba(30, 58, 138, 0.35)',
              borderRadius: 8,
              padding: '12px 18px',
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                flexWrap: 'wrap',
              }}
            >
              <span
                style={{
                  fontSize: '0.74rem',
                  fontWeight: 800,
                  color: '#94a3b8',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                }}
              >
                TRADER CATEGORY
              </span>

              {/* Non-Commercial Speculators */}
              <button
                onClick={() => setTraderCategory('non_commercial')}
                style={{
                  background:
                    traderCategory === 'non_commercial' ? '#0d9488' : '#0f172a',
                  color:
                    traderCategory === 'non_commercial' ? '#ffffff' : '#94a3b8',
                  border:
                    traderCategory === 'non_commercial'
                      ? '1px solid #14b8a6'
                      : '1px solid rgba(51, 65, 85, 0.7)',
                  borderRadius: 20,
                  padding: '6px 16px',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow:
                    traderCategory === 'non_commercial'
                      ? '0 0 12px rgba(20, 184, 166, 0.5)'
                      : 'none',
                  transition: 'all 0.15s ease',
                }}
              >
                Non-Commercial <span style={{ opacity: 0.85, fontSize: '0.72rem' }}>(Large Speculators)</span>
              </button>

              {/* Commercial Hedgers */}
              <button
                onClick={() => setTraderCategory('commercial')}
                style={{
                  background:
                    traderCategory === 'commercial' ? '#2563eb' : '#0f172a',
                  color:
                    traderCategory === 'commercial' ? '#ffffff' : '#94a3b8',
                  border:
                    traderCategory === 'commercial'
                      ? '1px solid #3b82f6'
                      : '1px solid rgba(51, 65, 85, 0.7)',
                  borderRadius: 20,
                  padding: '6px 16px',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow:
                    traderCategory === 'commercial'
                      ? '0 0 12px rgba(37, 99, 235, 0.5)'
                      : 'none',
                  transition: 'all 0.15s ease',
                }}
              >
                Commercial <span style={{ opacity: 0.85, fontSize: '0.72rem' }}>(Hedgers)</span>
              </button>

              {/* Non-Reportable Small Traders */}
              <button
                onClick={() => setTraderCategory('non_reportable')}
                style={{
                  background:
                    traderCategory === 'non_reportable' ? '#475569' : '#0f172a',
                  color:
                    traderCategory === 'non_reportable' ? '#ffffff' : '#94a3b8',
                  border:
                    traderCategory === 'non_reportable'
                      ? '1px solid #64748b'
                      : '1px solid rgba(51, 65, 85, 0.7)',
                  borderRadius: 20,
                  padding: '6px 16px',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow:
                    traderCategory === 'non_reportable'
                      ? '0 0 10px rgba(100, 116, 139, 0.4)'
                      : 'none',
                  transition: 'all 0.15s ease',
                }}
              >
                Non-Reportable <span style={{ opacity: 0.85, fontSize: '0.72rem' }}>(Small Traders)</span>
              </button>
            </div>

            {/* Explainer Notice Banner */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                background: 'rgba(15, 23, 42, 0.7)',
                border: '1px solid rgba(51, 65, 85, 0.5)',
                borderRadius: 6,
                padding: '6px 12px',
                fontSize: '0.75rem',
                color: '#94a3b8',
                lineHeight: 1.4,
              }}
            >
              <Info size={14} color="#38bdf8" />
              <span>
                Managed Money positioning lives in the Disaggregated and TFF reports — see Advanced Charts (Premium). This page covers the universal Legacy taxonomy that exists for every CFTC market.
              </span>
            </div>
          </div>

          {/* ── Main COT Index Chart Card ───────────────────────────────────── */}
          <div
            style={{
              background: 'linear-gradient(180deg, #070d18 0%, #0a1324 100%)',
              border: '1px solid rgba(30, 58, 138, 0.4)',
              borderRadius: 8,
              padding: '16px 20px',
              boxShadow: '0 12px 32px rgba(0, 0, 0, 0.5)',
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
            }}
          >
            {/* Chart Header Row */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 10,
              }}
            >
              {/* Left Brand Badge */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div
                  style={{
                    background: 'linear-gradient(135deg, rgba(20, 184, 166, 0.25) 0%, rgba(13, 148, 136, 0.1) 100%)',
                    border: '1px solid rgba(20, 184, 166, 0.4)',
                    padding: '3px 8px',
                    borderRadius: 4,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <LineChart size={14} color="#2dd4bf" />
                  <span
                    style={{
                      fontSize: '0.75rem',
                      fontWeight: 900,
                      color: '#2dd4bf',
                      letterSpacing: '0.06em',
                    }}
                  >
                    COT INDEX
                  </span>
                </div>
              </div>

              {/* Center Contract & Exchange Label */}
              <div
                style={{
                  fontSize: '0.95rem',
                  fontWeight: 800,
                  color: '#f8fafc',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <span>{activeMarket.name}</span>
                <span
                  style={{
                    background: 'rgba(56, 189, 248, 0.15)',
                    color: '#38bdf8',
                    padding: '1px 6px',
                    borderRadius: 4,
                    fontSize: '0.78rem',
                  }}
                >
                  {activeMarket.ticker}
                </span>
                <span style={{ color: '#64748b', fontSize: '0.8rem', fontWeight: 500 }}>
                  · {activeMarket.exchange}
                </span>
              </div>

              {/* Right: Timeframe Switcher & Download */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {['26W', '52W', '156W (3Y)', '260W (5Y)'].map((tfLabel) => {
                  const tfCode = tfLabel.split(' ')[0];
                  const active = timeframe === tfCode;
                  return (
                    <button
                      key={tfLabel}
                      onClick={() => setTimeframe(tfCode)}
                      style={{
                        background: active ? '#0d9488' : '#0f172a',
                        color: active ? '#ffffff' : '#94a3b8',
                        border: active
                          ? '1px solid #14b8a6'
                          : '1px solid rgba(51, 65, 85, 0.7)',
                        padding: '4px 10px',
                        borderRadius: 4,
                        fontSize: '0.72rem',
                        fontWeight: active ? 800 : 600,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {tfLabel}
                    </button>
                  );
                })}

                <button
                  onClick={handleExportCSV}
                  title="Export Chart CSV"
                  style={{
                    background: '#0f172a',
                    border: '1px solid rgba(51, 65, 85, 0.7)',
                    color: '#94a3b8',
                    padding: '5px 8px',
                    borderRadius: 4,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  <Download size={14} />
                </button>
              </div>
            </div>

            {/* Subheader Series & Zones Legend */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 12,
                fontSize: '0.74rem',
                borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                paddingBottom: 8,
              }}
            >
              {/* Series Legend */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <span style={{ color: '#64748b', fontWeight: 800 }}>SERIES</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span
                    style={{
                      width: 14,
                      height: 2.5,
                      background: categoryAccentColor,
                      display: 'inline-block',
                    }}
                  />
                  <span style={{ color: '#e2e8f0', fontWeight: 700 }}>
                    COT Index ({timeframe.toLowerCase()}){' '}
                    <span style={{ color: categoryAccentColor }}>
                      {hoveredPoint?.cot_index ?? chartData?.current_summary.cot_index ?? 50}
                    </span>
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span
                    style={{
                      width: 14,
                      height: 2.5,
                      background: '#ffffff',
                      display: 'inline-block',
                    }}
                  />
                  <span style={{ color: '#cbd5e1' }}>
                    Price{' '}
                    <span style={{ color: '#ffffff', fontWeight: 700 }}>
                      {formatPriceValue(hoveredPoint?.price ?? chartData?.current_summary.price)}
                    </span>
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span
                    style={{
                      width: 10,
                      height: 8,
                      background: 'rgba(51, 65, 85, 0.5)',
                      borderRadius: 2,
                      display: 'inline-block',
                    }}
                  />
                  <span style={{ color: '#94a3b8' }}>OI</span>
                </div>
              </div>

              {/* Zones Legend */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <span style={{ color: '#64748b', fontWeight: 800 }}>ZONES</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background: '#ef4444',
                    }}
                  />
                  <span style={{ color: '#f87171', fontWeight: 600 }}>Extreme long (&gt;80)</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background: '#10b981',
                    }}
                  />
                  <span style={{ color: '#4ade80', fontWeight: 600 }}>Extreme short (&lt;20)</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span
                    style={{
                      width: 12,
                      height: 1,
                      borderTop: '1px dashed #64748b',
                    }}
                  />
                  <span style={{ color: '#94a3b8' }}>Midline (50)</span>
                </div>
              </div>
            </div>

            {/* ── Visual Chart Rendering Canvas ────────────────────────────── */}
            {chartLoading ? (
              <div
                style={{
                  height: 340,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#64748b',
                  gap: 10,
                }}
              >
                <RefreshCw size={20} className="animate-spin" />
                <span>Generating Larry Williams COT Index series...</span>
              </div>
            ) : chartData && chartData.history.length > 0 ? (
              <div style={{ position: 'relative', width: '100%', userSelect: 'none' }}>
                {/* SVG Visual Canvas */}
                <div
                  style={{
                    position: 'relative',
                    height: 340,
                    width: '100%',
                    background: '#070c14',
                    borderRadius: 6,
                    border: '1px solid rgba(255, 255, 255, 0.05)',
                    overflow: 'hidden',
                  }}
                >
                  <svg
                    ref={svgRef}
                    viewBox="0 0 1000 340"
                    preserveAspectRatio="none"
                    style={{ width: '100%', height: '100%', cursor: 'crosshair' }}
                    onMouseMove={handleSvgMouseMove}
                    onMouseLeave={() => setHoverIndex(null)}
                  >
                    <defs>
                      {/* Gradient for Open Interest Area */}
                      <linearGradient id="oiGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#1e293b" stopOpacity="0.45" />
                        <stop offset="100%" stopColor="#0f172a" stopOpacity="0.05" />
                      </linearGradient>
                      {/* Gradient for COT Index Area */}
                      <linearGradient id="cotGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={categoryAccentColor} stopOpacity="0.25" />
                        <stop offset="100%" stopColor={categoryAccentColor} stopOpacity="0.0" />
                      </linearGradient>
                    </defs>

                    {/* 1. Zone Bands:
                        Total Height = 340
                        100 Index = Y 0
                        80 Index = Y 68   (Height = 68) -> Extreme Long
                        50 Index = Y 170  (Midline)
                        20 Index = Y 272  (Height = 68) -> Extreme Short
                        0 Index = Y 340
                    */}
                    {/* Top Extreme Long Zone (80 - 100) */}
                    <rect
                      x="0"
                      y="0"
                      width="1000"
                      height="68"
                      fill="rgba(185, 28, 28, 0.18)"
                    />
                    {/* Bottom Extreme Short Zone (0 - 20) */}
                    <rect
                      x="0"
                      y="272"
                      width="1000"
                      height="68"
                      fill="rgba(6, 95, 70, 0.22)"
                    />

                    {/* 2. Grid Horizontal Lines */}
                    {/* 100 line */}
                    <line x1="0" y1="0" x2="1000" y2="0" stroke="rgba(255, 255, 255, 0.08)" />
                    {/* 80 line (red dashed) */}
                    <line x1="0" y1="68" x2="1000" y2="68" stroke="rgba(239, 68, 68, 0.4)" strokeDasharray="3 3" />
                    {/* 50 Midline (grey dashed) */}
                    <line x1="0" y1="170" x2="1000" y2="170" stroke="rgba(148, 163, 184, 0.35)" strokeDasharray="4 4" />
                    {/* 20 line (green dashed) */}
                    <line x1="0" y1="272" x2="1000" y2="272" stroke="rgba(16, 185, 129, 0.4)" strokeDasharray="3 3" />
                    {/* 0 line */}
                    <line x1="0" y1="340" x2="1000" y2="340" stroke="rgba(255, 255, 255, 0.08)" />

                    {/* 3. Open Interest Area in background */}
                    {(() => {
                      const pts = chartData.history;
                      const maxOi = Math.max(...pts.map((p) => p.open_interest), 1);
                      const step = 1000 / Math.max(pts.length - 1, 1);
                      const oiPoints = pts
                        .map((p, i) => {
                          const x = i * step;
                          const y = 340 - (p.open_interest / maxOi) * 130;
                          return `${x},${y}`;
                        })
                        .join(' ');
                      const areaPath = `0,340 ${oiPoints} 1000,340`;
                      return <polygon points={areaPath} fill="url(#oiGradient)" />;
                    })()}

                    {/* 4. Price Line (solid light line) */}
                    {(() => {
                      const pts = chartData.history;
                      const prices = pts.map((p) => p.price);
                      const minPx = Math.min(...prices);
                      const maxPx = Math.max(...prices);
                      const pxSpan = maxPx - minPx;

                      if (pts.length < 2 || pxSpan <= 0.00001 || !isFinite(pxSpan)) {
                        return null;
                      }

                      const step = 1000 / Math.max(pts.length - 1, 1);

                      const polyPoints = pts
                        .map((p, i) => {
                          const x = i * step;
                          // Scale price to Y between 50 and 290
                          const norm = (p.price - minPx) / pxSpan;
                          const y = 290 - norm * 240;
                          return `${x},${y}`;
                        })
                        .join(' ');

                      return (
                        <polyline
                          fill="none"
                          stroke="#e2e8f0"
                          strokeWidth="2"
                          points={polyPoints}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      );
                    })()}

                    {/* 5. COT Index Curve (Teal / Blue / Slate neon line) */}
                    {(() => {
                      const pts = chartData.history;
                      const step = 1000 / Math.max(pts.length - 1, 1);

                      const polyPoints = pts
                        .map((p, i) => {
                          const x = i * step;
                          // 100 index = Y 0, 0 index = Y 340
                          const y = 340 - (p.cot_index / 100.0) * 340;
                          return `${x},${y}`;
                        })
                        .join(' ');

                      return (
                        <>
                          <polyline
                            fill="none"
                            stroke={categoryAccentColor}
                            strokeWidth="2.8"
                            points={polyPoints}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            style={{
                              filter: `drop-shadow(0 0 5px ${categoryAccentColor}aa)`,
                            }}
                          />
                          {pts.map((p, i) => {
                            const x = i * step;
                            const y = 340 - (p.cot_index / 100.0) * 340;
                            return (
                              <circle
                                key={i}
                                cx={x}
                                cy={y}
                                r={i === hoverIndex ? 5 : 2}
                                fill={categoryAccentColor}
                                stroke="#070c14"
                                strokeWidth="1.5"
                              />
                            );
                          })}
                        </>
                      );
                    })()}

                    {/* 6. Active Crosshair Line */}
                    {hoverIndex !== null && chartData.history[hoverIndex] && (
                      (() => {
                        const step = 1000 / Math.max(chartData.history.length - 1, 1);
                        const crossX = hoverIndex * step;
                        const pt = chartData.history[hoverIndex];
                        const cotY = 340 - (pt.cot_index / 100.0) * 340;

                        return (
                          <>
                            <line
                              x1={crossX}
                              y1="0"
                              x2={crossX}
                              y2="340"
                              stroke="rgba(255, 255, 255, 0.3)"
                              strokeDasharray="2 2"
                            />
                            <circle
                              cx={crossX}
                              cy={cotY}
                              r="6"
                              fill={categoryAccentColor}
                              stroke="#ffffff"
                              strokeWidth="2"
                              style={{
                                filter: `drop-shadow(0 0 6px ${categoryAccentColor})`,
                              }}
                            />
                          </>
                        );
                      })()
                    )}
                  </svg>

                  {/* Left Y-Axis Scale Labels (0 - 100) */}
                  <div
                    style={{
                      position: 'absolute',
                      left: 8,
                      top: 4,
                      bottom: 4,
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      pointerEvents: 'none',
                      fontSize: '0.68rem',
                      fontFamily: 'monospace',
                      fontWeight: 700,
                      color: '#64748b',
                    }}
                  >
                    <span style={{ color: '#ef4444' }}>100</span>
                    <span style={{ color: '#f87171' }}>80</span>
                    <span style={{ color: '#94a3b8' }}>50</span>
                    <span style={{ color: '#4ade80' }}>20</span>
                    <span style={{ color: '#10b981' }}>0</span>
                  </div>

                  {/* Right Y-Axis Price Labels */}
                  {(() => {
                    const pts = chartData.history;
                    const prices = pts.map((p) => p.price);
                    const minPx = Math.min(...prices);
                    const maxPx = Math.max(...prices);
                    const pxSpan = maxPx - minPx;

                    if (pxSpan <= 0.00001 || !isFinite(pxSpan)) {
                      return null;
                    }

                    const midPx = (minPx + maxPx) / 2;
                    return (
                      <div
                        style={{
                          position: 'absolute',
                          right: 8,
                          top: 8,
                          bottom: 8,
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                          pointerEvents: 'none',
                          fontSize: '0.68rem',
                          fontFamily: 'monospace',
                          color: '#94a3b8',
                          textAlign: 'right',
                        }}
                      >
                        <span>{formatPriceValue(maxPx)}</span>
                        <span>{formatPriceValue(midPx)}</span>
                        <span>{formatPriceValue(minPx)}</span>
                      </div>
                    );
                  })()}

                  {/* Floating Detailed Hover Tooltip */}
                  {hoveredPoint && (
                    <div
                      style={{
                        position: 'absolute',
                        top: 12,
                        left: '50%',
                        transform: 'translateX(-50%)',
                        background: 'rgba(15, 23, 42, 0.95)',
                        border: '1px solid rgba(51, 65, 85, 0.8)',
                        borderRadius: 6,
                        padding: '6px 14px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 16,
                        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.6)',
                        pointerEvents: 'none',
                        zIndex: 10,
                        fontSize: '0.74rem',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Calendar size={13} color="#64748b" />
                        <span style={{ color: '#f1f5f9', fontWeight: 700 }}>
                          {hoveredPoint.date}
                        </span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ color: '#94a3b8' }}>COT Index:</span>
                        <span
                          style={{
                            fontWeight: 800,
                            color: hoveredPoint.is_extreme_long
                              ? '#f87171'
                              : hoveredPoint.is_extreme_short
                              ? '#4ade80'
                              : categoryAccentColor,
                          }}
                        >
                          {hoveredPoint.cot_index}
                        </span>
                        <span
                          style={{
                            fontSize: '0.65rem',
                            padding: '1px 5px',
                            borderRadius: 3,
                            background: hoveredPoint.is_extreme_long
                              ? 'rgba(239, 68, 68, 0.25)'
                              : hoveredPoint.is_extreme_short
                              ? 'rgba(16, 185, 129, 0.25)'
                              : 'rgba(51, 65, 85, 0.5)',
                            color: hoveredPoint.is_extreme_long
                              ? '#f87171'
                              : hoveredPoint.is_extreme_short
                              ? '#4ade80'
                              : '#94a3b8',
                            fontWeight: 700,
                          }}
                        >
                          {hoveredPoint.zone_label}
                        </span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ color: '#94a3b8' }}>Net:</span>
                        <span style={{ color: '#ffffff', fontWeight: 700 }}>
                          {hoveredPoint.net > 0 ? `+${hoveredPoint.net.toLocaleString()}` : hoveredPoint.net.toLocaleString()}
                        </span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ color: '#94a3b8' }}>Price:</span>
                        <span style={{ color: '#ffffff', fontWeight: 700 }}>
                          {formatPriceValue(hoveredPoint.price)}
                        </span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ color: '#94a3b8' }}>OI:</span>
                        <span style={{ color: '#cbd5e1' }}>
                          {hoveredPoint.open_interest.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Bottom Timeline Date Axis (CFTC Tuesday cutoffs) */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    padding: '8px 4px 0 4px',
                    fontSize: '0.7rem',
                    color: '#64748b',
                    fontWeight: 600,
                  }}
                >
                  <span>{chartData.history[0]?.date_short || ''}</span>
                  <span>
                    {chartData.history[Math.floor(chartData.history.length * 0.25)]?.date_short || ''}
                  </span>
                  <span>
                    {chartData.history[Math.floor(chartData.history.length * 0.5)]?.date_short || ''}
                  </span>
                  <span>
                    {chartData.history[Math.floor(chartData.history.length * 0.75)]?.date_short || ''}
                  </span>
                  <span style={{ color: '#38bdf8', fontWeight: 700 }}>
                    {chartData.history[chartData.history.length - 1]?.date_short || ''}
                  </span>
                </div>
              </div>
            ) : null}

            {/* Status Footer Bar (cot-reports.com format) */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 8,
                fontSize: '0.74rem',
                color: '#64748b',
                paddingTop: 8,
                borderTop: '1px solid rgba(255, 255, 255, 0.05)',
              }}
            >
              <span>{chartData?.status_footer || ''}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ color: '#94a3b8' }}>
                  Current COT Index:{' '}
                  <b style={{ color: categoryAccentColor }}>
                    {chartData?.current_summary.cot_index ?? 50}
                  </b>{' '}
                  ({chartData?.current_summary.zone_label ?? 'Neutral'})
                </span>
                <span style={{ color: '#475569' }}>·</span>
                <span style={{ color: '#94a3b8' }}>
                  Net Contracts:{' '}
                  <b style={{ color: '#ffffff' }}>
                    {chartData?.current_summary.net_formatted ?? '0'}
                  </b>
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          SECTION 2: BARCHART LEGACY NET POSITIONS GRID
      ══════════════════════════════════════════════════════════════════════════ */}
      {(viewMode === 'table' || viewMode === 'both') && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Controls Bar */}
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 12,
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'var(--surface-1)',
              padding: '12px 16px',
              borderRadius: 8,
              border: '1px solid var(--border-subtle)',
            }}
          >
            {/* Left Controls */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
              {/* Category Filter */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                  Category:
                </span>
                <select
                  value={tableCategory}
                  onChange={(e) => setTableCategory(e.target.value)}
                  style={{
                    background: 'var(--surface-2)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 4,
                    padding: '5px 10px',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    outline: 'none',
                    cursor: 'pointer',
                  }}
                >
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              {/* Trader Group Filter */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                  Trader Group:
                </span>
                <select
                  value={tableTraderGroup}
                  onChange={(e) => setTableTraderGroup(e.target.value)}
                  style={{
                    background: 'var(--surface-2)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 4,
                    padding: '5px 10px',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    outline: 'none',
                    cursor: 'pointer',
                  }}
                >
                  <option value="non_commercial">Non-Commercial (Large Speculators)</option>
                  <option value="commercial">Commercial (Hedgers)</option>
                  <option value="open_interest">Open Interest</option>
                </select>
              </div>

              {/* Detailed Checkbox */}
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  fontSize: '0.78rem',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  userSelect: 'none',
                }}
              >
                <input
                  type="checkbox"
                  checked={tableDetailed}
                  onChange={(e) => setTableDetailed(e.target.checked)}
                  style={{ cursor: 'pointer' }}
                />
                Show Inverted / Cross Pairs
              </label>
            </div>

            {/* Right Controls */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {/* Search */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  background: 'var(--surface-2)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 4,
                  padding: '4px 8px',
                  gap: 6,
                }}
              >
                <Search size={14} color="var(--text-muted)" />
                <input
                  type="text"
                  placeholder="Search grid..."
                  value={tableSearch}
                  onChange={(e) => setTableSearch(e.target.value)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    outline: 'none',
                    color: 'var(--text-primary)',
                    fontSize: '0.78rem',
                    width: 110,
                  }}
                />
              </div>

              <button
                onClick={handleExportCSV}
                title="Download CSV"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  background: 'var(--surface-2)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-primary)',
                  padding: '5px 10px',
                  borderRadius: 4,
                  fontSize: '0.78rem',
                  cursor: 'pointer',
                }}
              >
                <Download size={13} />
                CSV
              </button>
            </div>
          </div>

          {/* Table Header Details Banner & Legend */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 12,
              padding: '6px 4px',
            }}
          >
            {/* Color Legend (Matching Screenshot 1 & 3) */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  border: '1px solid #22c55e',
                  padding: '3px 8px',
                  borderRadius: 4,
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  color: '#4ade80',
                  background: 'rgba(34, 197, 94, 0.1)',
                }}
              >
                52W High
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  border: '1px solid #ef4444',
                  padding: '3px 8px',
                  borderRadius: 4,
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  color: '#f87171',
                  background: 'rgba(239, 68, 68, 0.1)',
                }}
              >
                52W Low
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  border: '1px solid #a855f7',
                  padding: '3px 8px',
                  borderRadius: 4,
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  color: '#c084fc',
                  background: 'rgba(168, 85, 247, 0.1)',
                }}
              >
                Prior period's value was negative
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  border: '1px solid #0ea5e9',
                  padding: '3px 8px',
                  borderRadius: 4,
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  color: '#38bdf8',
                  background: 'rgba(14, 165, 233, 0.1)',
                }}
              >
                Prior period's value was positive
              </div>
            </div>

            {/* Next Release Dates Accordion */}
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setNextDatesOpen(!nextDatesOpen)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  background: 'transparent',
                  border: 'none',
                  color: '#38bdf8',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                <Calendar size={13} />
                Upcoming Release Dates
              </button>

              {nextDatesOpen && (
                <div
                  style={{
                    position: 'absolute',
                    top: '100%',
                    right: 0,
                    zIndex: 40,
                    background: 'var(--surface-1)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 6,
                    padding: 10,
                    boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                    minWidth: 260,
                    fontSize: '0.75rem',
                  }}
                >
                  <div style={{ fontWeight: 700, marginBottom: 6, color: 'var(--text-primary)' }}>
                    CFTC Release Schedule:
                  </div>
                  {legacyData?.next_release_dates && legacyData.next_release_dates.length > 0 ? (
                    legacyData.next_release_dates.map((item: { date: string; release: string }, idx: number) => (
                      <div
                        key={idx}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          padding: '3px 0',
                          color: 'var(--text-secondary)',
                        }}
                      >
                        <span>{item.date}</span>
                        <span style={{ color: '#38bdf8' }}>{item.release}</span>
                      </div>
                    ))
                  ) : legacyData?.next_release_info ? (
                    <div style={{ color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <div>Next Cutoff: <span style={{ color: '#38bdf8' }}>{legacyData.next_release_info.next_cutoff_date}</span></div>
                      <div>Next Release: <span style={{ color: '#4ade80' }}>{legacyData.next_release_info.next_release_date}</span></div>
                    </div>
                  ) : (
                    <div style={{ color: 'var(--text-muted)' }}>Weekly on Fridays at 3:30 PM ET</div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Grid Table */}
          <div
            style={{
              overflowX: 'auto',
              background: 'var(--surface-1)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 8,
              boxShadow: '0 4px 16px rgba(0, 0, 0, 0.25)',
            }}
          >
            {legacyLoading ? (
              <div
                style={{
                  padding: 40,
                  textAlign: 'center',
                  color: 'var(--text-muted)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 10,
                }}
              >
                <RefreshCw size={18} className="animate-spin" />
                <span>Loading Commitments of Traders positions...</span>
              </div>
            ) : groupedSections.length === 0 ? (
              <div style={{ padding: 30, textAlign: 'center', color: 'var(--text-muted)' }}>
                No contracts matching the specified filter.
              </div>
            ) : (
              <table
                style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  fontSize: '0.78rem',
                  textAlign: 'right',
                }}
              >
                <thead>
                  <tr
                    style={{
                      borderBottom: '1px solid var(--border-subtle)',
                      background: 'rgba(255, 255, 255, 0.02)',
                    }}
                  >
                    <th
                      style={{
                        textAlign: 'left',
                        padding: '10px 14px',
                        color: 'var(--text-secondary)',
                        fontWeight: 700,
                        width: '22%',
                      }}
                    >
                      Commodity
                    </th>
                    <th
                      style={{
                        padding: '10px 12px',
                        color: 'var(--text-secondary)',
                        fontWeight: 700,
                      }}
                    >
                      52W High
                    </th>
                    <th
                      style={{
                        padding: '10px 12px',
                        color: 'var(--text-secondary)',
                        fontWeight: 700,
                      }}
                    >
                      52W Low
                    </th>
                    {legacyData?.dates.map((d, i) => (
                      <th
                        key={i}
                        style={{
                          padding: '10px 12px',
                          color: i === 0 ? '#38bdf8' : 'var(--text-secondary)',
                          fontWeight: 700,
                        }}
                      >
                        {d}
                      </th>
                    ))}
                    <th
                      style={{
                        padding: '10px 14px',
                        color: 'var(--text-secondary)',
                        fontWeight: 700,
                      }}
                    >
                      Weekly Change
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {groupedSections.map((sec) => (
                    <React.Fragment key={sec.categoryName}>
                      {/* Section Category Header */}
                      {tableCategory === 'FULL LIST' && (
                        <tr>
                          <td
                            colSpan={10}
                            style={{
                              textAlign: 'left',
                              padding: '12px 14px 6px 14px',
                              fontWeight: 900,
                              color: '#38bdf8',
                              letterSpacing: '0.06em',
                              fontSize: '0.82rem',
                              borderBottom: '1px solid rgba(56, 189, 248, 0.2)',
                              background: 'rgba(56, 189, 248, 0.04)',
                            }}
                          >
                            {sec.categoryName}
                          </td>
                        </tr>
                      )}

                      {/* Contract Rows */}
                      {sec.rows.map((row) => (
                        <tr
                          key={row.symbol}
                          style={{
                            borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                            transition: 'background 0.1s ease',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'transparent';
                          }}
                        >
                          {/* Commodity Name with Interactive Click to Chart */}
                          <td
                            style={{
                              textAlign: 'left',
                              padding: '8px 14px',
                              fontWeight: 600,
                              color: '#38bdf8',
                            }}
                          >
                            <button
                              onClick={() => {
                                setActiveSymbol(row.symbol);
                                if (onSelectAsset) onSelectAsset(row.symbol);
                                // Scroll to chart
                                window.scrollTo({ top: 0, behavior: 'smooth' });
                              }}
                              style={{
                                background: 'transparent',
                                border: 'none',
                                color: '#38bdf8',
                                cursor: 'pointer',
                                padding: 0,
                                textAlign: 'left',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 6,
                                fontSize: '0.78rem',
                                fontWeight: 600,
                              }}
                              title="Click to view Larry Williams COT Index"
                            >
                              <LineChart size={13} color="#0284c7" />
                              <span>{row.commodity}</span>
                            </button>
                          </td>

                          {/* 52W High */}
                          <td style={{ padding: '8px 12px', color: 'var(--text-secondary)' }}>
                            {row.high_52w.toLocaleString()}
                          </td>

                          {/* 52W Low */}
                          <td style={{ padding: '8px 12px', color: 'var(--text-secondary)' }}>
                            {row.low_52w.toLocaleString()}
                          </td>

                          {/* 6 Trailing Tuesday Weekly Reports */}
                          {row.cells.map((cell, cIdx) => (
                            <td key={cIdx} style={{ padding: '4px 6px' }}>
                              <div
                                style={{
                                  padding: '4px 8px',
                                  display: 'inline-block',
                                  minWidth: 55,
                                  ...getCellHighlightStyle(cell),
                                }}
                              >
                                {cell.formatted}
                              </div>
                            </td>
                          ))}

                          {/* Weekly Change */}
                          <td
                            style={{
                              padding: '8px 14px',
                              fontWeight: 700,
                              color:
                                row.weekly_change > 0
                                  ? '#4ade80'
                                  : row.weekly_change < 0
                                  ? '#f87171'
                                  : 'var(--text-secondary)',
                            }}
                          >
                            {row.weekly_change_formatted}
                          </td>
                        </tr>
                      ))}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
export default COTReportView;
