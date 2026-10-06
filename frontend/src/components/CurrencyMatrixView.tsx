import React, { useEffect, useState, useRef } from 'react';
import {
  Grid3X3,
  ArrowUpDown,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Swords,
  CheckCircle2,
  Coins,
  Globe,
  Layers,
} from 'lucide-react';
import { CurrencyMatrixItem } from '../types/macro';
import { api } from '../services/api';
import { useTimezone } from '../context/TimezoneContext';

interface CellHoverData {
  base: string;
  quote: string;
  pair: string;
  score: number;
  bias: string;
  confidence: number;
  driver: string;
  x: number;
  y: number;
}

interface CurrencyMatrixViewProps {
  theme?: 'dark' | 'light';
  onSelectPairAsset?: (symbol: string) => void;
  onOpenMacroBattle?: (base: string, quote: string) => void;
  onRefresh?: () => void;
}

function getMatrixCellStyles(score: number, isLight: boolean) {
  const isPositive = score > 0;
  const intensity = Math.min(0.4, Math.abs(score) / 160.0);

  if (isLight) {
    const alpha = (0.09 + intensity * 0.28).toFixed(2);
    return {
      bg: isPositive ? `rgba(16, 185, 129, ${alpha})` : `rgba(239, 68, 68, ${alpha})`,
      textColor: isPositive ? '#065f46' : '#991b1b',
      arrowColor: isPositive ? '#065f46' : '#991b1b',
      borderColor: isPositive ? 'rgba(5, 150, 105, 0.35)' : 'rgba(220, 38, 38, 0.35)',
    };
  } else {
    const alpha = (0.14 + intensity).toFixed(2);
    return {
      bg: isPositive ? `rgba(16, 185, 129, ${alpha})` : `rgba(239, 68, 68, ${alpha})`,
      textColor: isPositive ? '#6ee7b7' : '#fca5a5',
      arrowColor: isPositive ? '#34d399' : '#f87171',
      borderColor: 'var(--border-subtle)',
    };
  }
}

export const CurrencyMatrixView: React.FC<CurrencyMatrixViewProps> = ({
  theme = 'dark',
  onSelectPairAsset,
  onOpenMacroBattle,
  onRefresh,
}) => {
  const { activeOption, formatTime } = useTimezone();

  const [isLightMode, setIsLightMode] = useState<boolean>(() => {
    if (typeof document !== 'undefined') {
      const docTheme = document.documentElement.getAttribute('data-theme');
      if (docTheme === 'light' || document.body.classList.contains('theme-light')) return true;
      if (docTheme === 'dark') return false;
      const saved = localStorage.getItem('terminal-theme');
      if (saved === 'light') return true;
    }
    return theme === 'light';
  });

  useEffect(() => {
    const checkTheme = () => {
      const docTheme = document.documentElement.getAttribute('data-theme');
      const isL =
        theme === 'light' ||
        docTheme === 'light' ||
        (typeof document !== 'undefined' && document.body.classList.contains('theme-light'));
      setIsLightMode(isL);
    };
    checkTheme();

    if (typeof document !== 'undefined') {
      const observer = new MutationObserver(checkTheme);
      observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'class'] });
      observer.observe(document.body, { attributes: true, attributeFilter: ['data-theme', 'class'] });
      return () => observer.disconnect();
    }
  }, [theme]);

  const [matrix, setMatrix] = useState<CurrencyMatrixItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [justRefreshed, setJustRefreshed] = useState(false);
  const [lastRefreshedDate, setLastRefreshedDate] = useState<Date | null>(null);
  const [hoveredCell, setHoveredCell] = useState<CellHoverData | null>(null);
  const [assetFilter, setAssetFilter] = useState<'all' | 'currencies' | 'metals'>('all');
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadData = async (triggerSync = false) => {
    if (isRefreshing) return;
    if (triggerSync) {
      setIsRefreshing(true);
      setJustRefreshed(false);
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    } else {
      setLoading(true);
    }

    try {
      if (triggerSync) {
        try {
          await api.triggerLiveSync();
        } catch (syncErr) {
          console.warn('Live sync warning on matrix refresh:', syncErr);
        }
      }
      const data = await api.getCurrencyMatrix();
      setMatrix(data);
      setLastRefreshedDate(new Date());

      if (triggerSync) {
        if (onRefresh) {
          try {
            onRefresh();
          } catch (e) {
            console.error('Parent refresh error:', e);
          }
        }
        setJustRefreshed(true);
        refreshTimerRef.current = setTimeout(() => {
          setJustRefreshed(false);
        }, 3500);
      }
    } catch (err) {
      console.error('Failed to load currency matrix:', err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadData(false);
    const interval = setInterval(() => {
      api.getCurrencyMatrix()
        .then((data) => {
          setMatrix(data);
          setLastRefreshedDate(new Date());
        })
        .catch(console.error);
    }, 30000);
    return () => {
      clearInterval(interval);
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    };
  }, []);

  const isMetal = (item: CurrencyMatrixItem) =>
    item.asset_class === 'metal' ||
    item.asset_class === 'commodity' ||
    ['XAU', 'XAG', 'XPT', 'COPPER'].includes(item.currency);

  const currencyCount = matrix.filter((c) => !isMetal(c)).length;
  const metalCount = matrix.filter((c) => isMetal(c)).length;

  const displayMatrix = matrix.filter((c) => {
    if (assetFilter === 'currencies') return !isMetal(c);
    if (assetFilter === 'metals') return isMetal(c);
    return true;
  });

  const displayCurrencies = displayMatrix.map((m) => m.currency);

  const handleMouseEnterCell = (
    e: React.MouseEvent,
    row: CurrencyMatrixItem,
    colCurr: string,
    score: number
  ) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const isBull = score > 10;
    const isBear = score < -10;
    const bias = isBull
      ? score > 25
        ? 'STRONG BULLISH'
        : 'BULLISH'
      : isBear
      ? score < -25
        ? 'STRONG BEARISH'
        : 'BEARISH'
      : 'NEUTRAL';

    const isMetalBase = isMetal(row);
    const isMetalQuote = ['XAU', 'XAG', 'XPT', 'COPPER'].includes(colCurr);

    const driver = isMetalBase && isMetalQuote
      ? `${row.currency} vs ${colCurr} gold/silver beta and monetary-industrial divergence`
      : isMetalBase
      ? `${row.currency} real yield sensitivity & central bank reserve inflows vs ${colCurr}`
      : isMetalQuote
      ? `${row.currency} monetary policy divergence and carry cost against bullion ${colCurr}`
      : row.policy_stance.includes('Hawkish') || row.policy_stance.includes('Restrictive')
      ? `${row.currency} monetary policy divergence over ${colCurr}`
      : `${row.currency} yield differential & growth momentum vs ${colCurr}`;

    setHoveredCell({
      base: row.currency,
      quote: colCurr,
      pair: `${row.currency}${colCurr}`,
      score,
      bias,
      confidence: Math.min(94, Math.max(70, Math.round(75 + Math.abs(score) * 0.2))),
      driver,
      x: rect.right + 10,
      y: rect.top,
    });
  };

  const getMetalBadge = (code: string) => {
    switch (code) {
      case 'XAU':
        return { label: 'GOLD', color: '#eab308', bg: 'rgba(234, 179, 8, 0.15)', border: 'rgba(234, 179, 8, 0.4)' };
      case 'XAG':
        return { label: 'SILVER', color: '#94a3b8', bg: 'rgba(148, 163, 184, 0.15)', border: 'rgba(148, 163, 184, 0.4)' };
      case 'XPT':
        return { label: 'PLATINUM', color: '#38bdf8', bg: 'rgba(56, 189, 248, 0.15)', border: 'rgba(56, 189, 248, 0.4)' };
      case 'COPPER':
        return { label: 'COPPER', color: '#f97316', bg: 'rgba(249, 115, 22, 0.15)', border: 'rgba(249, 115, 22, 0.4)' };
      default:
        return null;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, position: 'relative' }}>
      {/* Top Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 14,
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
              Global Relative-Value Fundamental Strength Matrix
            </h2>
            <span
              style={{
                fontSize: '0.68rem',
                fontWeight: 700,
                padding: '3px 8px',
                borderRadius: 4,
                background: 'rgba(56, 189, 248, 0.12)',
                color: 'var(--accent-cyan)',
                border: '1px solid rgba(56, 189, 248, 0.25)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              {displayCurrencies.length}×{displayCurrencies.length} Cross Matrix
            </span>
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 4 }}>
            Base vs. Quote relative fundamental strength model • Hover cells for driver attribution
            {lastRefreshedDate && (
              <span style={{ marginLeft: 8, color: 'var(--text-muted)' }}>
                • Synced{' '}
                <span className="mono" style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>
                  {formatTime(lastRefreshedDate, true)}
                </span>
              </span>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* Asset Class Filter Pills */}
          <div
            style={{
              display: 'flex',
              background: 'var(--surface-2)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 6,
              padding: 2,
              gap: 2,
            }}
          >
            <button
              onClick={() => setAssetFilter('all')}
              style={{
                padding: '5px 12px',
                fontSize: '0.75rem',
                fontWeight: 700,
                borderRadius: 4,
                border: 'none',
                background: assetFilter === 'all' ? 'var(--accent-blue)' : 'transparent',
                color: assetFilter === 'all' ? '#fff' : 'var(--text-muted)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                transition: 'all 0.15s ease',
              }}
            >
              <Layers size={13} />
              All Assets ({matrix.length})
            </button>
            <button
              onClick={() => setAssetFilter('currencies')}
              style={{
                padding: '5px 12px',
                fontSize: '0.75rem',
                fontWeight: 700,
                borderRadius: 4,
                border: 'none',
                background: assetFilter === 'currencies' ? 'var(--accent-blue)' : 'transparent',
                color: assetFilter === 'currencies' ? '#fff' : 'var(--text-muted)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                transition: 'all 0.15s ease',
              }}
            >
              <Globe size={13} />
              G10 Currencies ({currencyCount})
            </button>
            <button
              onClick={() => setAssetFilter('metals')}
              style={{
                padding: '5px 12px',
                fontSize: '0.75rem',
                fontWeight: 700,
                borderRadius: 4,
                border: 'none',
                background: assetFilter === 'metals' ? '#eab308' : 'transparent',
                color: assetFilter === 'metals' ? '#000' : 'var(--text-muted)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                transition: 'all 0.15s ease',
              }}
            >
              <Coins size={13} />
              Precious Metals ({metalCount})
            </button>
          </div>

          {lastRefreshedDate && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                fontSize: '0.75rem',
                color: 'var(--text-muted)',
              }}
            >
              <span
                style={{
                  display: 'inline-block',
                  width: 7,
                  height: 7,
                  borderRadius: '50%',
                  background: isRefreshing ? '#38bdf8' : '#10b981',
                  boxShadow: isRefreshing
                    ? '0 0 8px #38bdf8'
                    : '0 0 8px #10b981',
                }}
              />
              <span>{isRefreshing ? 'Recalculating...' : 'Live Synced'}</span>
            </div>
          )}

          <button
            id="refresh-matrix-btn"
            onClick={() => loadData(true)}
            disabled={isRefreshing}
            title="Recalculate fundamental cross-asset relative strength matrix"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '7px 14px',
              borderRadius: 6,
              background: 'var(--surface-2)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-primary)',
              cursor: isRefreshing ? 'not-allowed' : 'pointer',
              fontWeight: 700,
              fontSize: '0.78rem',
              boxShadow: 'var(--shadow-sm)',
              transition: 'all 0.15s ease',
            }}
          >
            <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
            <span>{isRefreshing ? 'Recalculating...' : 'Refresh Matrix'}</span>
          </button>
        </div>
      </div>

      {/* Ranked Assets Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))',
          gap: 12,
        }}
      >
        {displayMatrix.map((c, idx) => {
          const metalBadge = getMetalBadge(c.currency);
          const isItemMetal = isMetal(c);

          let topBorder = `3px solid ${isLightMode ? '#cbd5e1' : 'var(--border-strong)'}`;
          if (c.currency === 'XAU') topBorder = '3px solid #eab308';
          else if (c.currency === 'XAG') topBorder = '3px solid #94a3b8';
          else if (c.currency === 'XPT') topBorder = '3px solid #38bdf8';
          else if (c.currency === 'COPPER') topBorder = '3px solid #f97316';
          else if (c.rank <= 3) topBorder = `3px solid ${isLightMode ? '#059669' : '#10b981'}`;
          else if (c.rank >= 9) topBorder = `3px solid ${isLightMode ? '#dc2626' : '#f43f5e'}`;

          return (
            <div
              key={c.currency}
              style={{
                background: 'var(--surface-1)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                padding: '12px 14px',
                borderTop: topBorder,
                boxShadow: 'var(--shadow-sm)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span
                    className="mono"
                    style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)' }}
                  >
                    {c.currency}
                  </span>
                  {metalBadge && (
                    <span
                      style={{
                        fontSize: '0.62rem',
                        fontWeight: 800,
                        padding: '1px 5px',
                        borderRadius: 3,
                        background: metalBadge.bg,
                        color: metalBadge.color,
                        border: `1px solid ${metalBadge.border}`,
                      }}
                    >
                      {metalBadge.label}
                    </span>
                  )}
                </div>
                <span
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    color: isLightMode ? '#334155' : 'var(--text-muted)',
                    background: isLightMode ? '#e2e8f0' : 'var(--surface-3)',
                    padding: '2px 6px',
                    borderRadius: 4,
                  }}
                >
                  #{assetFilter === 'all' ? c.rank : idx + 1}
                </span>
              </div>
              <div style={{ fontSize: '0.75rem', color: isLightMode ? '#475569' : 'var(--text-muted)', marginTop: 2 }}>
                {c.name}
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 8 }}>
                <span
                  className="mono"
                  style={{
                    fontSize: '1.25rem',
                    fontWeight: 800,
                    color:
                      c.absolute_score >= 0
                        ? isLightMode ? '#059669' : '#10b981'
                        : isLightMode ? '#dc2626' : '#f43f5e',
                  }}
                >
                  {c.absolute_score > 0 ? `+${c.absolute_score.toFixed(1)}` : c.absolute_score.toFixed(1)}
                </span>
              </div>
              <div
                style={{
                  fontSize: '0.75rem',
                  color: isLightMode ? '#475569' : 'var(--text-dim)',
                  marginTop: 6,
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: 4,
                }}
              >
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.policy_stance}</span>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.growth_stance}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Cross-Comparison Matrix Table */}
      <div
        style={{
          background: 'var(--surface-1)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-lg)',
          padding: '18px',
          overflowX: 'auto',
          boxShadow: 'var(--shadow-sm)',
          position: 'relative',
        }}
      >
        {isRefreshing && (
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: 3,
              background: 'linear-gradient(90deg, #38bdf8, #10b981, #38bdf8)',
              backgroundSize: '200% 100%',
              animation: 'shimmer 1.5s infinite linear',
              borderTopLeftRadius: 'var(--radius-lg)',
              borderTopRightRadius: 'var(--radius-lg)',
            }}
          />
        )}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
          <h3 style={{ fontSize: '0.92rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
            Pair Relative Macro Scores (Row Base vs. Column Quote)
          </h3>
          <span className="matrix-legend-text" style={{ fontSize: '0.75rem', fontWeight: 600 }}>
            Green = Base Asset Strength (Bullish Cross) • Red = Quote Asset Strength • Click cell to launch Macro Battle
          </span>
        </div>

        <table
          style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem', textAlign: 'center' }}
        >
          <thead>
            <tr style={{ background: isLightMode ? '#f1f5f9' : 'var(--surface-2)' }}>
              <th
                className="matrix-th-base"
                style={{
                  padding: '10px 14px',
                  textAlign: 'left',
                  fontWeight: 800,
                  fontSize: '0.76rem',
                }}
              >
                BASE \ QUOTE
              </th>
              {displayCurrencies.map((curr) => (
                <th
                  key={curr}
                  className="mono matrix-th-quote"
                  style={{
                    padding: '10px 10px',
                    fontWeight: 800,
                    fontSize: '0.82rem',
                  }}
                >
                  {curr}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {displayMatrix.map((row) => (
              <tr key={row.currency} style={{ borderBottom: isLightMode ? '1px solid #e2e8f0' : '1px solid var(--border-subtle)' }}>
                <td
                  style={{
                    padding: '10px 14px',
                    textAlign: 'left',
                    fontWeight: 800,
                    fontSize: '0.84rem',
                  }}
                  className="mono matrix-row-header"
                >
                  {row.currency}
                </td>
                {displayCurrencies.map((col) => {
                  if (row.currency === col) {
                    return (
                      <td
                        key={col}
                        className="matrix-cell-diagonal"
                        style={{
                          padding: '10px 10px',
                          fontWeight: 700,
                        }}
                      >
                        ?
                      </td>
                    );
                  }
                  const score = row.relative_scores[col] || 0.0;
                  const isPositive = score > 0;
                  const { bg, textColor, borderColor } = getMatrixCellStyles(score, isLightMode);
                  const ArrowIcon = isPositive ? ArrowUpRight : ArrowDownRight;

                  return (
                    <td
                      key={col}
                      className={`mono ${isPositive ? 'matrix-cell-positive' : 'matrix-cell-negative'}`}
                      style={{
                        padding: '10px 10px',
                        background: bg,
                        color: textColor,
                        fontWeight: 800,
                        fontSize: '0.82rem',
                        border: `1px solid ${borderColor}`,
                        cursor: 'pointer',
                        transition: 'transform 0.1s ease',
                      }}
                      onMouseEnter={(e) => handleMouseEnterCell(e, row, col, score)}
                      onMouseLeave={() => setHoveredCell(null)}
                      onClick={() => {
                        if (onOpenMacroBattle) {
                          onOpenMacroBattle(row.currency, col);
                        } else if (onSelectPairAsset) {
                          const pairSym = row.currency === 'COPPER' && col === 'USD' ? 'HG' : `${row.currency}${col}`;
                          onSelectPairAsset(pairSym);
                        }
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3 }}>
                        <span className={isPositive ? 'matrix-cell-positive' : 'matrix-cell-negative'}>
                          {score > 0 ? `+${score.toFixed(0)}` : score.toFixed(0)}
                        </span>
                        <ArrowIcon size={12} color="currentColor" strokeWidth={2.5} />
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Interactive Cell Hovercard Popover */}
      {hoveredCell && (
        <div
          style={{
            position: 'fixed',
            left: Math.min(window.innerWidth - 280, hoveredCell.x),
            top: Math.max(80, hoveredCell.y - 40),
            background: isLightMode ? '#ffffff' : 'var(--surface-elevated)',
            border: isLightMode ? '1px solid #cbd5e1' : '1px solid var(--border-active)',
            borderRadius: 'var(--radius-md)',
            padding: '14px',
            boxShadow: isLightMode ? '0 12px 30px -4px rgba(0, 0, 0, 0.15)' : 'var(--shadow-lg)',
            zIndex: 90,
            pointerEvents: 'none',
            minWidth: 240,
            backdropFilter: 'blur(10px)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
            <span className="mono" style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              {hoveredCell.pair}
            </span>
            <span
              style={{
                fontSize: '0.75rem',
                fontWeight: 800,
                padding: '2px 6px',
                borderRadius: 4,
                background:
                  hoveredCell.score >= 0
                    ? (isLightMode ? 'rgba(16, 185, 129, 0.18)' : 'rgba(16, 185, 129, 0.2)')
                    : (isLightMode ? 'rgba(239, 68, 68, 0.18)' : 'rgba(239, 68, 68, 0.2)'),
                color:
                  hoveredCell.score >= 0
                    ? (isLightMode ? '#065f46' : '#34d399')
                    : (isLightMode ? '#991b1b' : '#f87171'),
              }}
            >
              {hoveredCell.bias}
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 4 }}>
            <span style={{ fontSize: '0.75rem', color: isLightMode ? '#475569' : 'var(--text-secondary)' }}>Relative Score:</span>
            <span
              className="mono"
              style={{
                fontSize: '1.1rem',
                fontWeight: 800,
                color:
                  hoveredCell.score >= 0
                    ? (isLightMode ? '#059669' : '#10b981')
                    : (isLightMode ? '#dc2626' : '#ef4444'),
              }}
            >
              {hoveredCell.score > 0 ? `+${hoveredCell.score.toFixed(1)}` : hoveredCell.score.toFixed(1)}
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 2 }}>
            <span style={{ fontSize: '0.75rem', color: isLightMode ? '#475569' : 'var(--text-secondary)' }}>Model Confidence:</span>
            <span className="mono" style={{ fontSize: '0.75rem', fontWeight: 700, color: isLightMode ? '#0284c7' : '#38bdf8' }}>
              {hoveredCell.confidence}%
            </span>
          </div>

          <div
            style={{
              marginTop: 8,
              paddingTop: 6,
              borderTop: isLightMode ? '1px solid #e2e8f0' : '1px solid var(--border-subtle)',
              fontSize: '0.75rem',
              color: isLightMode ? '#334155' : 'var(--text-secondary)',
              lineHeight: 1.35,
            }}
          >
            {hoveredCell.driver}
          </div>

          <div
            style={{
              marginTop: 6,
              fontSize: '0.75rem',
              color: isLightMode ? '#0369a1' : 'var(--accent-cyan)',
              textAlign: 'center',
              fontWeight: 600,
            }}
          >
            Click cell to launch Macro Battle clash
          </div>
        </div>
      )}
    </div>
  );
};
