import React, { useState, useEffect, useMemo } from 'react';
import { Download, ArrowUpDown, ChevronUp, ChevronDown, Calendar, Layers, Shield, Users, BarChart3 } from 'lucide-react';
import { COTWeeklyBreakdownResponse, COTWeeklyBreakdownRow } from '../types/macro';

interface COTWeeklyBreakdownTableProps {
  data: COTWeeklyBreakdownResponse | null;
  loading: boolean;
  timeframe: string;
  onTimeframeChange: (tf: string) => void;
  isLight?: boolean;
}

const formatNumber = (val: number | undefined | null): string => {
  if (val === undefined || val === null || isNaN(val)) return '-';
  return val.toLocaleString('en-US');
};

const formatSigned = (val: number | undefined | null): string => {
  if (val === undefined || val === null || isNaN(val)) return '-';
  if (val > 0) return `+${val.toLocaleString('en-US')}`;
  return val.toLocaleString('en-US');
};

const formatPercent = (val: number | undefined | null): string => {
  if (val === undefined || val === null || isNaN(val)) return '-';
  return `${val.toFixed(2)}%`;
};

const formatPrice = (val: number | undefined | null): string => {
  if (val === undefined || val === null || isNaN(val)) return '-';
  if (val >= 1000) return val.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 2 });
  if (val >= 10) return val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (val >= 1) return val.toFixed(2);
  return val.toFixed(4);
};

export const COTWeeklyBreakdownTable: React.FC<COTWeeklyBreakdownTableProps> = ({
  data,
  loading,
  timeframe,
  onTimeframeChange,
  isLight: propIsLight,
}) => {
  // Live reactive light mode detection across React props, DOM data-theme and body classes
  const [isLight, setIsLight] = useState<boolean>(() => {
    if (typeof document !== 'undefined') {
      const docTheme = document.documentElement.getAttribute('data-theme');
      if (docTheme === 'light' || document.body.classList.contains('theme-light')) return true;
      if (docTheme === 'dark') return false;
      const saved = localStorage.getItem('terminal-theme');
      if (saved === 'light') return true;
    }
    return Boolean(propIsLight);
  });

  useEffect(() => {
    const checkTheme = () => {
      const docTheme = document.documentElement.getAttribute('data-theme');
      const isL =
        Boolean(propIsLight) ||
        docTheme === 'light' ||
        (typeof document !== 'undefined' && document.body.classList.contains('theme-light'));
      setIsLight(isL);
    };
    checkTheme();

    if (typeof document !== 'undefined') {
      const observer = new MutationObserver(checkTheme);
      observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'class'] });
      observer.observe(document.body, { attributes: true, attributeFilter: ['data-theme', 'class'] });
      return () => observer.disconnect();
    }
  }, [propIsLight]);

  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc'); // asc = oldest to newest (like cot-reports.com)

  const rows: COTWeeklyBreakdownRow[] = useMemo(() => {
    if (!data?.reports) return [];
    const list = [...data.reports];
    if (sortDirection === 'desc') {
      list.reverse();
    }
    return list;
  }, [data, sortDirection]);

  // Max Open Interest across the dataset for relative heatmapping
  const maxOI = useMemo(() => {
    if (!rows.length) return 1;
    return Math.max(...rows.map((r) => r.open_interest || 1));
  }, [rows]);

  const minOI = useMemo(() => {
    if (!rows.length) return 1;
    return Math.min(...rows.map((r) => r.open_interest || 1));
  }, [rows]);

  // Heatmap styling helpers with enhanced high-contrast light and dark palettes
  const getSpreadHeatmap = (pct: number) => {
    const alpha = Math.min(0.45, Math.max(0.08, (pct / 40) * 0.4));
    return {
      backgroundColor: isLight ? `rgba(59, 130, 246, ${alpha * 0.55})` : `rgba(37, 99, 235, ${alpha})`,
      color: isLight ? '#1e3a8a' : '#bfdbfe',
      fontWeight: 600,
    };
  };

  const getLongHeatmap = (pct: number) => {
    const alpha = Math.min(0.45, Math.max(0.08, (pct / 60) * 0.4));
    return {
      backgroundColor: isLight ? `rgba(16, 185, 129, ${alpha * 0.55})` : `rgba(5, 150, 105, ${alpha})`,
      color: isLight ? '#065f46' : '#a7f3d0',
      fontWeight: 600,
    };
  };

  const getShortHeatmap = (pct: number) => {
    const alpha = Math.min(0.45, Math.max(0.08, (pct / 70) * 0.4));
    return {
      backgroundColor: isLight ? `rgba(239, 68, 68, ${alpha * 0.55})` : `rgba(220, 38, 38, ${alpha})`,
      color: isLight ? '#991b1b' : '#fecaca',
      fontWeight: 600,
    };
  };

  const getOIHeatmap = (oi: number) => {
    const span = Math.max(1, maxOI - minOI);
    const ratio = Math.max(0, Math.min(1, (oi - minOI) / span));
    const alpha = 0.08 + ratio * 0.28;
    return {
      backgroundColor: isLight ? `rgba(2, 132, 199, ${alpha * 0.55})` : `rgba(14, 165, 233, ${alpha})`,
      color: isLight ? '#0369a1' : '#bae6fd',
      fontWeight: 600,
    };
  };

  // Change coloring
  const getChangeStyle = (val: number) => {
    if (val > 0) {
      return {
        color: isLight ? '#15803d' : '#4ade80',
        fontWeight: 700,
      };
    }
    if (val < 0) {
      return {
        color: isLight ? '#dc2626' : '#f87171',
        fontWeight: 700,
      };
    }
    return {
      color: isLight ? '#64748b' : 'var(--text-muted)',
    };
  };

  // Net position badge styling
  const getNetStyle = (net: number, group: 'noncomm' | 'comm' | 'nonrept') => {
    const isPos = net > 0;
    if (group === 'noncomm') {
      return {
        backgroundColor: isPos
          ? isLight ? 'rgba(16, 185, 129, 0.16)' : 'rgba(16, 185, 129, 0.25)'
          : isLight ? 'rgba(239, 68, 68, 0.16)' : 'rgba(239, 68, 68, 0.25)',
        color: isPos
          ? isLight ? '#047857' : '#34d399'
          : isLight ? '#b91c1c' : '#f87171',
        fontWeight: 800,
      };
    }
    if (group === 'comm') {
      return {
        backgroundColor: isPos
          ? isLight ? 'rgba(16, 185, 129, 0.16)' : 'rgba(16, 185, 129, 0.22)'
          : isLight ? 'rgba(239, 68, 68, 0.16)' : 'rgba(239, 68, 68, 0.22)',
        color: isPos
          ? isLight ? '#047857' : '#34d399'
          : isLight ? '#b91c1c' : '#f87171',
        fontWeight: 800,
      };
    }
    // non-reportable
    return {
      backgroundColor: isPos
        ? isLight ? 'rgba(245, 158, 11, 0.16)' : 'rgba(245, 158, 11, 0.25)'
        : isLight ? 'rgba(239, 68, 68, 0.16)' : 'rgba(239, 68, 68, 0.25)',
      color: isPos
        ? isLight ? '#b45309' : '#fbbf24'
        : isLight ? '#b91c1c' : '#f87171',
      fontWeight: 800,
    };
  };

  const handleExportCSV = () => {
    if (!data?.reports?.length) return;
    const headers = [
      'Date', 'Date ISO',
      'NonComm Long', 'NonComm Short', 'NonComm Chg Long', 'NonComm Chg Short', 'NonComm Net', 'NonComm Spreads', '%OI NC Spread', '%OI NC Long', '%OI NC Short',
      'Comm Long', 'Comm Short', 'Comm Chg Long', 'Comm Chg Short', 'Comm Net', '%OI Comm Long', '%OI Comm Short',
      'NonRept Long', 'NonRept Short', 'NonRept Chg Long', 'NonRept Chg Short', 'NonRept Net', '%OI NonRept Long', '%OI NonRept Short',
      'Open Interest', 'Chg Open Interest', 'Price'
    ];
    const csvRows = [headers.join(',')];
    for (const r of rows) {
      csvRows.push([
        `"${r.date_formatted}"`, `"${r.date_iso}"`,
        r.noncomm_long, r.noncomm_short, r.change_noncomm_long, r.change_noncomm_short, r.noncomm_net, r.noncomm_spreading, r.pct_oi_noncomm_spreading, r.pct_oi_noncomm_long, r.pct_oi_noncomm_short,
        r.comm_long, r.comm_short, r.change_comm_long, r.change_comm_short, r.comm_net, r.pct_oi_comm_long, r.pct_oi_comm_short,
        r.nonrept_long, r.nonrept_short, r.change_nonrept_long, r.change_nonrept_short, r.nonrept_net, r.pct_oi_nonrept_long, r.pct_oi_nonrept_short,
        r.open_interest, r.change_open_interest, r.price ?? ''
      ].join(','));
    }
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `COT_Reports_${data.market.ticker}_${timeframe}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const timeframes = ['YTD', '3M', '6M', '1Y', '2Y', '3Y', '5Y', '10Y'];

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        width: '100%',
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      }}
    >
      {/* ── Time Period & Export Controls Bar ────── */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12,
          background: isLight ? 'var(--surface-1)' : 'linear-gradient(180deg, #090e17 0%, #0c1424 100%)',
          border: isLight ? '1px solid var(--border-subtle)' : '1px solid rgba(30, 58, 138, 0.35)',
          borderRadius: 8,
          padding: '12px 18px',
          boxShadow: isLight ? 'var(--shadow-sm)' : 'none',
        }}
      >
        {/* Left: Time Period Selector Pills */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <span
            style={{
              fontSize: '0.72rem',
              fontWeight: 800,
              color: isLight ? '#475569' : '#94a3b8',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
            }}
          >
            TIME PERIOD:
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
            {timeframes.map((tf) => {
              const active = timeframe.toUpperCase() === tf.toUpperCase();
              return (
                <button
                  key={tf}
                  onClick={() => onTimeframeChange(tf)}
                  style={{
                    background: active
                      ? isLight ? '#0d9488' : '#0d9488'
                      : isLight ? 'var(--surface-2)' : '#0f172a',
                    color: active ? '#ffffff' : isLight ? 'var(--text-secondary)' : '#94a3b8',
                    border: active
                      ? '1px solid #14b8a6'
                      : isLight ? '1px solid var(--border-subtle)' : '1px solid rgba(51, 65, 85, 0.7)',
                    borderRadius: 4,
                    padding: '5px 12px',
                    fontSize: '0.74rem',
                    fontWeight: active ? 800 : 600,
                    cursor: 'pointer',
                    boxShadow: active ? '0 0 10px rgba(20, 184, 166, 0.45)' : 'none',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {tf}
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: Sort Order & CSV Export */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            onClick={() => setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')}
            title="Toggle chronological order"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              background: isLight ? 'var(--surface-2)' : '#0f172a',
              border: isLight ? '1px solid var(--border-subtle)' : '1px solid rgba(51, 65, 85, 0.7)',
              color: isLight ? 'var(--text-primary)' : '#e2e8f0',
              padding: '6px 12px',
              borderRadius: 6,
              fontSize: '0.74rem',
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: isLight ? 'var(--shadow-sm)' : 'none',
            }}
          >
            <ArrowUpDown size={13} />
            <span>{sortDirection === 'asc' ? 'Oldest First' : 'Newest First'}</span>
          </button>

          <button
            onClick={handleExportCSV}
            title="Export CSV"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              background: isLight ? 'var(--surface-2)' : '#0f172a',
              border: isLight ? '1px solid var(--border-subtle)' : '1px solid rgba(51, 65, 85, 0.7)',
              color: isLight ? 'var(--text-primary)' : '#e2e8f0',
              padding: '6px 12px',
              borderRadius: 6,
              fontSize: '0.74rem',
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: isLight ? 'var(--shadow-sm)' : 'none',
            }}
          >
            <Download size={13} />
            <span>CSV</span>
          </button>
        </div>
      </div>

      {/* ── Table Top Brand Banner ───────── */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12,
          background: isLight
            ? 'var(--surface-1)'
            : 'linear-gradient(90deg, #06242c 0%, #0a3d4a 100%)',
          color: isLight ? 'var(--text-primary)' : '#ffffff',
          padding: '12px 18px',
          borderRadius: 8,
          border: isLight ? '1px solid var(--border-subtle)' : '1px solid rgba(20, 184, 166, 0.25)',
          boxShadow: isLight ? 'var(--shadow-sm)' : '0 4px 16px rgba(0,0,0,0.4)',
        }}
      >
        {/* Left: Asset Title & Badges */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: '50%',
                background: '#0d9488',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 10px rgba(13, 148, 136, 0.6)',
              }}
            >
              <BarChart3 size={16} color="#ffffff" />
            </div>
            <span style={{ fontSize: '0.98rem', fontWeight: 900, letterSpacing: '0.04em' }}>
              {data?.market.name || 'MARKET'} - {data?.market.exchange || 'EXCHANGE'}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', fontSize: '0.72rem' }}>
            <span
              style={{
                background: isLight ? 'var(--surface-2)' : 'rgba(0,0,0,0.3)',
                border: isLight ? '1px solid var(--border-subtle)' : 'none',
                padding: '3px 8px',
                borderRadius: 4,
                fontFamily: 'monospace',
              }}
            >
              CFTC: <b style={{ color: isLight ? '#0d9488' : '#2dd4bf' }}>{data?.market.cftc_code || '-'}</b>
            </span>
            <span
              style={{
                background: isLight ? 'var(--surface-2)' : 'rgba(0,0,0,0.3)',
                border: isLight ? '1px solid var(--border-subtle)' : 'none',
                padding: '3px 8px',
                borderRadius: 4,
                fontFamily: 'monospace',
              }}
            >
              TICKER: <b style={{ color: isLight ? '#0284c7' : '#38bdf8' }}>{data?.market.ticker || '-'}</b>
            </span>
            {data?.market.contract_units && (
              <span
                style={{
                  background: isLight ? 'var(--surface-2)' : 'rgba(0,0,0,0.3)',
                  border: isLight ? '1px solid var(--border-subtle)' : 'none',
                  padding: '3px 8px',
                  borderRadius: 4,
                }}
              >
                UNITS: <b>{data.market.contract_units}</b>
              </span>
            )}
            <span
              style={{
                background: isLight ? 'var(--surface-2)' : 'rgba(0,0,0,0.3)',
                border: isLight ? '1px solid var(--border-subtle)' : 'none',
                padding: '3px 8px',
                borderRadius: 4,
              }}
            >
              EXCHANGE: <b>{data?.market.exchange || '-'}</b>
            </span>
            <span
              style={{
                background: isLight ? 'var(--surface-2)' : 'rgba(0,0,0,0.3)',
                border: isLight ? '1px solid var(--border-subtle)' : 'none',
                padding: '3px 8px',
                borderRadius: 4,
              }}
            >
              RANGE: <b>{data?.date_range_label || timeframe}</b>
            </span>
            <span
              style={{
                background: isLight ? 'var(--surface-2)' : 'rgba(0,0,0,0.3)',
                border: isLight ? '1px solid var(--border-subtle)' : 'none',
                padding: '3px 8px',
                borderRadius: 4,
              }}
            >
              REPORTS: <b style={{ color: isLight ? '#b45309' : '#fef08a' }}>{data?.records_count || rows.length} Weeks</b>
            </span>
          </div>
        </div>

        {/* Right: Institutional Badge */}
        <div style={{ fontSize: '0.72rem', color: isLight ? '#64748b' : '#94a3b8', fontWeight: 600 }}>
          COT-Reports Institutional Engine
        </div>
      </div>

      {/* ── The Comprehensive Multi-tier Data Table Container ───────────────── */}
      <div
        style={{
          width: '100%',
          background: isLight ? '#ffffff' : '#070b13',
          border: isLight ? '1px solid var(--border-subtle)' : '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: 8,
          boxShadow: isLight ? 'var(--shadow-sm)' : '0 8px 30px rgba(0,0,0,0.6)',
          overflow: 'hidden',
        }}
      >
        {/* Table Title Bar (Full width fixed card header, never cuts off when scrolling) */}
        <div
          style={{
            background: isLight ? '#f8fafc' : '#0c1424',
            color: isLight ? '#0f172a' : '#f8fafc',
            padding: '10px 16px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: isLight ? '1px solid #e2e8f0' : '1px solid rgba(255, 255, 255, 0.1)',
            flexWrap: 'wrap',
            gap: 8,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: '0.92rem', fontWeight: 900, letterSpacing: '0.04em' }}>
              {data?.market.name || 'US DOLLAR INDEX'} - {data?.market.exchange || 'ICE'}
            </span>
          </div>
          {data?.market.contract_units && (
            <div
              style={{
                fontSize: '0.74rem',
                color: isLight ? '#475569' : '#94a3b8',
                fontFamily: 'monospace',
                fontWeight: 700,
                letterSpacing: '0.04em',
              }}
            >
              CONTRACTS OF {data.market.contract_units.toUpperCase()}
            </div>
          )}
        </div>

        {/* Horizontally and Vertically Scrolling Table Wrapper with Sticky Headers */}
        <div
          style={{
            width: '100%',
            overflow: 'auto',
            maxHeight: 'calc(100vh - 240px)',
            minHeight: 480,
            borderBottom: isLight ? '1px solid #cbd5e1' : '1px solid rgba(255, 255, 255, 0.1)',
          }}
        >
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: '0.72rem',
              textAlign: 'right',
              whiteSpace: 'nowrap',
            }}
          >
            {/* Header Tier 1 (Category Groups - Sticky Top) */}
            <thead>
              <tr
                style={{
                  fontSize: '0.7rem',
                  fontWeight: 900,
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                }}
              >
                <th
                  rowSpan={2}
                  style={{
                    textAlign: 'left',
                    padding: '10px 14px',
                    background: isLight ? '#f1f5f9' : '#080d1a',
                    color: isLight ? '#0f172a' : '#ffffff',
                    borderRight: isLight ? '1px solid #cbd5e1' : '1px solid rgba(255, 255, 255, 0.12)',
                    borderBottom: isLight ? '2px solid #cbd5e1' : '2px solid rgba(255, 255, 255, 0.15)',
                    position: 'sticky',
                    left: 0,
                    top: 0,
                    zIndex: 35,
                    minWidth: 105,
                    fontWeight: 900,
                  }}
                >
                  DATE
                </th>

                {/* NON-COMMERCIAL Header Band (Red/Crimson) */}
                <th
                  colSpan={9}
                  style={{
                    textAlign: 'center',
                    padding: '8px 10px',
                    background: isLight ? '#fee2e2' : '#7f1d1d',
                    color: isLight ? '#991b1b' : '#ffffff',
                    borderRight: isLight ? '1px solid #f87171' : '1px solid rgba(255, 255, 255, 0.12)',
                    borderBottom: isLight ? '1px solid #fca5a5' : '1px solid rgba(255, 255, 255, 0.15)',
                    fontWeight: 900,
                    position: 'sticky',
                    top: 0,
                    zIndex: 20,
                  }}
                >
                  NON-COMMERCIAL (LARGE SPECULATORS)
                </th>

                {/* COMMERCIAL Header Band (Royal Blue) */}
                <th
                  colSpan={7}
                  style={{
                    textAlign: 'center',
                    padding: '8px 10px',
                    background: isLight ? '#dbeafe' : '#1e3a8a',
                    color: isLight ? '#1e40af' : '#ffffff',
                    borderRight: isLight ? '1px solid #60a5fa' : '1px solid rgba(255, 255, 255, 0.12)',
                    borderBottom: isLight ? '1px solid #93c5fd' : '1px solid rgba(255, 255, 255, 0.15)',
                    fontWeight: 900,
                    position: 'sticky',
                    top: 0,
                    zIndex: 20,
                  }}
                >
                  COMMERCIAL (HEDGERS)
                </th>

                {/* NON-REPORTABLE Header Band (Teal/Slate) */}
                <th
                  colSpan={7}
                  style={{
                    textAlign: 'center',
                    padding: '8px 10px',
                    background: isLight ? '#ccfbf1' : '#134e4a',
                    color: isLight ? '#0f766e' : '#ffffff',
                    borderRight: isLight ? '1px solid #2dd4bf' : '1px solid rgba(255, 255, 255, 0.12)',
                    borderBottom: isLight ? '1px solid #5eead4' : '1px solid rgba(255, 255, 255, 0.15)',
                    fontWeight: 900,
                    position: 'sticky',
                    top: 0,
                    zIndex: 20,
                  }}
                >
                  NON-REPORTABLE (SMALL SPECULATORS)
                </th>

                {/* OPEN INTEREST & PRICE Band */}
                <th
                  colSpan={2}
                  style={{
                    textAlign: 'center',
                    padding: '8px 10px',
                    background: isLight ? '#e0f2fe' : '#075985',
                    color: isLight ? '#0369a1' : '#ffffff',
                    borderBottom: isLight ? '1px solid #7dd3fc' : '1px solid rgba(255, 255, 255, 0.15)',
                    fontWeight: 900,
                    position: 'sticky',
                    top: 0,
                    zIndex: 20,
                  }}
                >
                  OPEN INTEREST
                </th>
              </tr>

              {/* Header Tier 2 (Sub-Columns with sticky top: 34px and high contrast) */}
              <tr
                style={{
                  fontSize: '0.66rem',
                  fontWeight: 800,
                  borderBottom: isLight ? '2px solid #cbd5e1' : '2px solid rgba(255, 255, 255, 0.15)',
                }}
              >
                {/* Non-Commercial sub-columns */}
                <th style={{ padding: '6px 8px', background: isLight ? '#fef2f2' : '#991b1b', color: isLight ? '#991b1b' : '#ffffff', position: 'sticky', top: 34, zIndex: 20 }}>LONGS</th>
                <th style={{ padding: '6px 8px', background: isLight ? '#fef2f2' : '#991b1b', color: isLight ? '#991b1b' : '#ffffff', position: 'sticky', top: 34, zIndex: 20 }}>SHORTS</th>
                <th style={{ padding: '6px 8px', background: isLight ? '#fef2f2' : '#991b1b', color: isLight ? '#991b1b' : '#ffffff', position: 'sticky', top: 34, zIndex: 20 }}>CHANGE LONGS</th>
                <th style={{ padding: '6px 8px', background: isLight ? '#fef2f2' : '#991b1b', color: isLight ? '#991b1b' : '#ffffff', position: 'sticky', top: 34, zIndex: 20 }}>CHANGE SHORTS</th>
                <th style={{ padding: '6px 8px', background: isLight ? '#fecaca' : '#5b1212', color: isLight ? '#7f1d1d' : '#ffffff', fontWeight: 900, position: 'sticky', top: 34, zIndex: 20 }}>NET POSITIONS</th>
                <th style={{ padding: '6px 8px', background: isLight ? '#fef2f2' : '#991b1b', color: isLight ? '#991b1b' : '#ffffff', position: 'sticky', top: 34, zIndex: 20 }}>SPREADS</th>
                <th style={{ padding: '6px 8px', background: isLight ? '#fef2f2' : '#991b1b', color: isLight ? '#991b1b' : '#ffffff', position: 'sticky', top: 34, zIndex: 20 }}>%OI SPREADS</th>
                <th style={{ padding: '6px 8px', background: isLight ? '#fef2f2' : '#991b1b', color: isLight ? '#991b1b' : '#ffffff', position: 'sticky', top: 34, zIndex: 20 }}>%OI LONGS</th>
                <th style={{ padding: '6px 8px', background: isLight ? '#fef2f2' : '#991b1b', color: isLight ? '#991b1b' : '#ffffff', borderRight: isLight ? '1px solid #f87171' : '1px solid rgba(255,255,255,0.15)', position: 'sticky', top: 34, zIndex: 20 }}>%OI SHORTS</th>

                {/* Commercial sub-columns */}
                <th style={{ padding: '6px 8px', background: isLight ? '#eff6ff' : '#1e40af', color: isLight ? '#1e40af' : '#ffffff', position: 'sticky', top: 34, zIndex: 20 }}>LONGS</th>
                <th style={{ padding: '6px 8px', background: isLight ? '#eff6ff' : '#1e40af', color: isLight ? '#1e40af' : '#ffffff', position: 'sticky', top: 34, zIndex: 20 }}>SHORTS</th>
                <th style={{ padding: '6px 8px', background: isLight ? '#eff6ff' : '#1e40af', color: isLight ? '#1e40af' : '#ffffff', position: 'sticky', top: 34, zIndex: 20 }}>CHANGE LONGS</th>
                <th style={{ padding: '6px 8px', background: isLight ? '#eff6ff' : '#1e40af', color: isLight ? '#1e40af' : '#ffffff', position: 'sticky', top: 34, zIndex: 20 }}>CHANGE SHORTS</th>
                <th style={{ padding: '6px 8px', background: isLight ? '#bfdbfe' : '#172554', color: isLight ? '#1e3a8a' : '#ffffff', fontWeight: 900, position: 'sticky', top: 34, zIndex: 20 }}>NET POSITIONS</th>
                <th style={{ padding: '6px 8px', background: isLight ? '#eff6ff' : '#1e40af', color: isLight ? '#1e40af' : '#ffffff', position: 'sticky', top: 34, zIndex: 20 }}>%OI LONGS</th>
                <th style={{ padding: '6px 8px', background: isLight ? '#eff6ff' : '#1e40af', color: isLight ? '#1e40af' : '#ffffff', borderRight: isLight ? '1px solid #60a5fa' : '1px solid rgba(255,255,255,0.15)', position: 'sticky', top: 34, zIndex: 20 }}>%OI SHORTS</th>

                {/* Non-Reportable sub-columns */}
                <th style={{ padding: '6px 8px', background: isLight ? '#f0fdfa' : '#0f766e', color: isLight ? '#0f766e' : '#ffffff', position: 'sticky', top: 34, zIndex: 20 }}>LONGS</th>
                <th style={{ padding: '6px 8px', background: isLight ? '#f0fdfa' : '#0f766e', color: isLight ? '#0f766e' : '#ffffff', position: 'sticky', top: 34, zIndex: 20 }}>SHORTS</th>
                <th style={{ padding: '6px 8px', background: isLight ? '#f0fdfa' : '#0f766e', color: isLight ? '#0f766e' : '#ffffff', position: 'sticky', top: 34, zIndex: 20 }}>CHANGE LONGS</th>
                <th style={{ padding: '6px 8px', background: isLight ? '#f0fdfa' : '#0f766e', color: isLight ? '#0f766e' : '#ffffff', position: 'sticky', top: 34, zIndex: 20 }}>CHANGE SHORTS</th>
                <th style={{ padding: '6px 8px', background: isLight ? '#99f6e4' : '#042f2e', color: isLight ? '#115e59' : '#ffffff', fontWeight: 900, position: 'sticky', top: 34, zIndex: 20 }}>NET POSITIONS</th>
                <th style={{ padding: '6px 8px', background: isLight ? '#f0fdfa' : '#0f766e', color: isLight ? '#0f766e' : '#ffffff', position: 'sticky', top: 34, zIndex: 20 }}>%OI LONGS</th>
                <th style={{ padding: '6px 8px', background: isLight ? '#f0fdfa' : '#0f766e', color: isLight ? '#0f766e' : '#ffffff', borderRight: isLight ? '1px solid #2dd4bf' : '1px solid rgba(255,255,255,0.15)', position: 'sticky', top: 34, zIndex: 20 }}>%OI SHORTS</th>

                {/* Open Interest sub-columns */}
                <th style={{ padding: '6px 8px', background: isLight ? '#f0f9ff' : '#0369a1', color: isLight ? '#0369a1' : '#ffffff', position: 'sticky', top: 34, zIndex: 20 }}>TOTAL</th>
                <th style={{ padding: '6px 8px', background: isLight ? '#f0f9ff' : '#0369a1', color: isLight ? '#0369a1' : '#ffffff', position: 'sticky', top: 34, zIndex: 20 }}>PRICE</th>
              </tr>
            </thead>

            {/* Table Body */}
            <tbody style={{ fontFamily: "'JetBrains Mono', 'Fira Code', 'Roboto Mono', monospace" }}>
              {loading ? (
                <tr>
                  <td colSpan={26} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                    Loading institutional COT records...
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={26} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                    No historical COT report records available for this market.
                  </td>
                </tr>
              ) : (
                rows.map((r, idx) => {
                  const isEven = idx % 2 === 0;
                  const rowBg = isEven
                    ? isLight ? '#ffffff' : '#070b13'
                    : isLight ? '#f8fafc' : '#0b1120';

                  return (
                    <tr
                      key={r.date_iso}
                      style={{
                        backgroundColor: rowBg,
                        borderBottom: isLight ? '1px solid #e2e8f0' : '1px solid rgba(255, 255, 255, 0.05)',
                        transition: 'background-color 0.1s ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = isLight ? 'rgba(56, 189, 248, 0.08)' : 'rgba(56, 189, 248, 0.12)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = rowBg;
                      }}
                    >
                      {/* Date Column (Sticky Left) */}
                      <td
                        style={{
                          textAlign: 'left',
                          padding: '7px 12px',
                          fontWeight: 700,
                          color: isLight ? '#0f172a' : '#f8fafc',
                          borderRight: isLight ? '1px solid #cbd5e1' : '1px solid rgba(255, 255, 255, 0.08)',
                          backgroundColor: rowBg,
                          position: 'sticky',
                          left: 0,
                          zIndex: 10,
                        }}
                      >
                        {r.date_formatted}
                      </td>

                      {/* Non-Commercial (Large Speculators) */}
                      <td style={{ padding: '7px 8px', color: isLight ? '#1e293b' : '#cbd5e1' }}>
                        {formatNumber(r.noncomm_long)}
                      </td>
                      <td style={{ padding: '7px 8px', color: isLight ? '#1e293b' : '#cbd5e1' }}>
                        {formatNumber(r.noncomm_short)}
                      </td>
                      <td style={{ padding: '7px 8px', ...getChangeStyle(r.change_noncomm_long) }}>
                        {formatSigned(r.change_noncomm_long)}
                      </td>
                      <td style={{ padding: '7px 8px', ...getChangeStyle(r.change_noncomm_short) }}>
                        {formatSigned(r.change_noncomm_short)}
                      </td>
                      <td style={{ padding: '7px 8px', ...getNetStyle(r.noncomm_net, 'noncomm') }}>
                        {formatNumber(r.noncomm_net)}
                      </td>
                      <td style={{ padding: '7px 8px', color: isLight ? '#1e293b' : '#cbd5e1' }}>
                        {formatNumber(r.noncomm_spreading)}
                      </td>
                      <td style={{ padding: '7px 8px', ...getSpreadHeatmap(r.pct_oi_noncomm_spreading) }}>
                        {formatPercent(r.pct_oi_noncomm_spreading)}
                      </td>
                      <td style={{ padding: '7px 8px', ...getLongHeatmap(r.pct_oi_noncomm_long) }}>
                        {formatPercent(r.pct_oi_noncomm_long)}
                      </td>
                      <td
                        style={{
                          padding: '7px 8px',
                          borderRight: isLight ? '1px solid #cbd5e1' : '1px solid rgba(255, 255, 255, 0.1)',
                          ...getShortHeatmap(r.pct_oi_noncomm_short),
                        }}
                      >
                        {formatPercent(r.pct_oi_noncomm_short)}
                      </td>

                      {/* Commercial (Hedgers) */}
                      <td style={{ padding: '7px 8px', color: isLight ? '#1e293b' : '#cbd5e1' }}>
                        {formatNumber(r.comm_long)}
                      </td>
                      <td style={{ padding: '7px 8px', color: isLight ? '#1e293b' : '#cbd5e1' }}>
                        {formatNumber(r.comm_short)}
                      </td>
                      <td style={{ padding: '7px 8px', ...getChangeStyle(r.change_comm_long) }}>
                        {formatSigned(r.change_comm_long)}
                      </td>
                      <td style={{ padding: '7px 8px', ...getChangeStyle(r.change_comm_short) }}>
                        {formatSigned(r.change_comm_short)}
                      </td>
                      <td style={{ padding: '7px 8px', ...getNetStyle(r.comm_net, 'comm') }}>
                        {formatNumber(r.comm_net)}
                      </td>
                      <td style={{ padding: '7px 8px', ...getLongHeatmap(r.pct_oi_comm_long) }}>
                        {formatPercent(r.pct_oi_comm_long)}
                      </td>
                      <td
                        style={{
                          padding: '7px 8px',
                          borderRight: isLight ? '1px solid #cbd5e1' : '1px solid rgba(255, 255, 255, 0.1)',
                          ...getShortHeatmap(r.pct_oi_comm_short),
                        }}
                      >
                        {formatPercent(r.pct_oi_comm_short)}
                      </td>

                      {/* Non-Reportable (Small Speculators) */}
                      <td style={{ padding: '7px 8px', color: isLight ? '#1e293b' : '#cbd5e1' }}>
                        {formatNumber(r.nonrept_long)}
                      </td>
                      <td style={{ padding: '7px 8px', color: isLight ? '#1e293b' : '#cbd5e1' }}>
                        {formatNumber(r.nonrept_short)}
                      </td>
                      <td style={{ padding: '7px 8px', ...getChangeStyle(r.change_nonrept_long) }}>
                        {formatSigned(r.change_nonrept_long)}
                      </td>
                      <td style={{ padding: '7px 8px', ...getChangeStyle(r.change_nonrept_short) }}>
                        {formatSigned(r.change_nonrept_short)}
                      </td>
                      <td style={{ padding: '7px 8px', ...getNetStyle(r.nonrept_net, 'nonrept') }}>
                        {formatNumber(r.nonrept_net)}
                      </td>
                      <td style={{ padding: '7px 8px', ...getLongHeatmap(r.pct_oi_nonrept_long) }}>
                        {formatPercent(r.pct_oi_nonrept_long)}
                      </td>
                      <td
                        style={{
                          padding: '7px 8px',
                          borderRight: isLight ? '1px solid #cbd5e1' : '1px solid rgba(255, 255, 255, 0.1)',
                          ...getShortHeatmap(r.pct_oi_nonrept_short),
                        }}
                      >
                        {formatPercent(r.pct_oi_nonrept_short)}
                      </td>

                      {/* Open Interest & Price */}
                      <td style={{ padding: '7px 8px', ...getOIHeatmap(r.open_interest) }}>
                        {formatNumber(r.open_interest)}
                      </td>
                      <td style={{ padding: '7px 8px', color: isLight ? '#0f172a' : '#f8fafc', fontWeight: 700 }}>
                        {formatPrice(r.price)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* ── Table Footer Status Bar ───────────── */}
        <div
          style={{
            background: isLight ? '#f8fafc' : '#04070d',
            color: isLight ? '#0f172a' : '#f8fafc',
            padding: '10px 16px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 12,
            borderTop: isLight ? '1px solid #e2e8f0' : '1px solid rgba(255, 255, 255, 0.1)',
            fontSize: '0.72rem',
          }}
        >
          {/* Left: Next Release Banner */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span
              style={{
                background: '#dc2626',
                color: '#ffffff',
                padding: '3px 8px',
                borderRadius: 4,
                fontSize: '0.68rem',
                fontWeight: 900,
                letterSpacing: '0.04em',
              }}
            >
              NEXT RELEASE: {data?.next_release_date || 'Oct 9, 2026'}
            </span>
            <span style={{ color: isLight ? '#475569' : '#94a3b8', fontWeight: 600 }}>
              CFTC releases weekly every Friday at 3:30 PM ET
            </span>
          </div>

          {/* Center: Group Badges Legend */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span
              style={{
                background: isLight ? '#fee2e2' : '#7f1d1d',
                color: isLight ? '#991b1b' : '#fecaca',
                border: isLight ? '1px solid #fca5a5' : 'none',
                padding: '2px 8px',
                borderRadius: 4,
                fontSize: '0.66rem',
                fontWeight: 800,
              }}
            >
              NON-COMMERCIAL (LARGE SPECULATORS)
            </span>
            <span
              style={{
                background: isLight ? '#dbeafe' : '#1e3a8a',
                color: isLight ? '#1e40af' : '#bfdbfe',
                border: isLight ? '1px solid #93c5fd' : 'none',
                padding: '2px 8px',
                borderRadius: 4,
                fontSize: '0.66rem',
                fontWeight: 800,
              }}
            >
              COMMERCIAL (HEDGERS)
            </span>
            <span
              style={{
                background: isLight ? '#ccfbf1' : '#134e4a',
                color: isLight ? '#0f766e' : '#a7f3d0',
                border: isLight ? '1px solid #5eead4' : 'none',
                padding: '2px 8px',
                borderRadius: 4,
                fontSize: '0.66rem',
                fontWeight: 800,
              }}
            >
              NON-REPORTABLE (SMALL SPECULATORS)
            </span>
            <span
              style={{
                background: isLight ? '#e0f2fe' : '#075985',
                color: isLight ? '#0369a1' : '#bae6fd',
                border: isLight ? '1px solid #7dd3fc' : 'none',
                padding: '2px 8px',
                borderRadius: 4,
                fontSize: '0.66rem',
                fontWeight: 800,
              }}
            >
              TOTAL OPEN INTEREST
            </span>
          </div>

          {/* Right: Signature */}
          <div style={{ color: isLight ? '#64748b' : '#64748b', fontSize: '0.68rem', fontWeight: 600 }}>
            An original format by COT-Reports.com • Institutional Integration
          </div>
        </div>
      </div>
    </div>
  );
};
