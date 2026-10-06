import React, { useState, useEffect, useMemo } from 'react';
import { Download, ArrowUpDown, BarChart3, Palette } from 'lucide-react';
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
  const [heatmapMode, setHeatmapMode] = useState<'vibrant' | 'subtle'>('vibrant');

  const rows: COTWeeklyBreakdownRow[] = useMemo(() => {
    if (!data?.reports) return [];
    const list = [...data.reports];
    if (sortDirection === 'desc') {
      list.reverse();
    }
    return list;
  }, [data, sortDirection]);

  // Precompute stats across all columns for relative multi-tier heatmapping
  const stats = useMemo(() => {
    if (!rows.length) return null;

    const getMinMax = (getter: (r: COTWeeklyBreakdownRow) => number | undefined | null) => {
      let min = Infinity;
      let max = -Infinity;
      for (const r of rows) {
        const v = getter(r);
        if (v !== undefined && v !== null && !isNaN(v)) {
          if (v < min) min = v;
          if (v > max) max = v;
        }
      }
      return {
        min: min === Infinity ? 0 : min,
        max: max === -Infinity ? 1 : max,
      };
    };

    const getMaxAbs = (getter: (r: COTWeeklyBreakdownRow) => number | undefined | null) => {
      let maxAbs = 0;
      for (const r of rows) {
        const v = getter(r);
        if (v !== undefined && v !== null && !isNaN(v)) {
          const abs = Math.abs(v);
          if (abs > maxAbs) maxAbs = abs;
        }
      }
      return maxAbs || 1;
    };

    return {
      // Non-Commercial (Large Speculators)
      noncomm_long: getMinMax((r) => r.noncomm_long),
      noncomm_short: getMinMax((r) => r.noncomm_short),
      change_noncomm_long_abs: getMaxAbs((r) => r.change_noncomm_long),
      change_noncomm_short_abs: getMaxAbs((r) => r.change_noncomm_short),
      noncomm_net_abs: getMaxAbs((r) => r.noncomm_net),
      noncomm_spreading: getMinMax((r) => r.noncomm_spreading),
      pct_oi_noncomm_spreading: getMinMax((r) => r.pct_oi_noncomm_spreading),
      pct_oi_noncomm_long: getMinMax((r) => r.pct_oi_noncomm_long),
      pct_oi_noncomm_short: getMinMax((r) => r.pct_oi_noncomm_short),

      // Commercial (Hedgers)
      comm_long: getMinMax((r) => r.comm_long),
      comm_short: getMinMax((r) => r.comm_short),
      change_comm_long_abs: getMaxAbs((r) => r.change_comm_long),
      change_comm_short_abs: getMaxAbs((r) => r.change_comm_short),
      comm_net_abs: getMaxAbs((r) => r.comm_net),
      pct_oi_comm_long: getMinMax((r) => r.pct_oi_comm_long),
      pct_oi_comm_short: getMinMax((r) => r.pct_oi_comm_short),

      // Non-Reportable (Small Speculators)
      nonrept_long: getMinMax((r) => r.nonrept_long),
      nonrept_short: getMinMax((r) => r.nonrept_short),
      change_nonrept_long_abs: getMaxAbs((r) => r.change_nonrept_long),
      change_nonrept_short_abs: getMaxAbs((r) => r.change_nonrept_short),
      nonrept_net_abs: getMaxAbs((r) => r.nonrept_net),
      pct_oi_nonrept_long: getMinMax((r) => r.pct_oi_nonrept_long),
      pct_oi_nonrept_short: getMinMax((r) => r.pct_oi_nonrept_short),

      // Open Interest & Price
      open_interest: getMinMax((r) => r.open_interest),
      price: getMinMax((r) => r.price),
    };
  }, [rows]);

  // Heatmap intensity modifier
  const intensity = heatmapMode === 'vibrant' ? 1.0 : 0.6;

  // 1. Contracts Magnitude Heatmap (Longs - Emerald Green gradient)
  const getLongContractsHeatmap = (val: number, range?: { min: number; max: number }) => {
    if (!range || range.max === range.min) return { color: isLight ? '#0f172a' : '#f8fafc' };
    const ratio = Math.max(0, Math.min(1, (val - range.min) / (range.max - range.min)));
    const alpha = (0.05 + ratio * 0.22) * intensity;
    return {
      backgroundColor: isLight ? `rgba(16, 185, 129, ${alpha})` : `rgba(16, 185, 129, ${alpha * 1.1})`,
      color: isLight ? '#0f172a' : '#f8fafc',
      fontWeight: 600,
    };
  };

  // 2. Contracts Magnitude Heatmap (Shorts - Coral/Ruby gradient)
  const getShortContractsHeatmap = (val: number, range?: { min: number; max: number }) => {
    if (!range || range.max === range.min) return { color: isLight ? '#0f172a' : '#f8fafc' };
    const ratio = Math.max(0, Math.min(1, (val - range.min) / (range.max - range.min)));
    const alpha = (0.05 + ratio * 0.22) * intensity;
    return {
      backgroundColor: isLight ? `rgba(244, 63, 94, ${alpha})` : `rgba(244, 63, 94, ${alpha * 1.1})`,
      color: isLight ? '#0f172a' : '#f8fafc',
      fontWeight: 600,
    };
  };

  // 3. Change in Longs (Signed Heatmap: Positive = Green Bullish, Negative = Red Bearish)
  const getChangeLongsHeatmap = (val: number, maxAbs?: number) => {
    if (!val || val === 0) {
      return { color: isLight ? '#64748b' : '#94a3b8' };
    }
    const maxVal = maxAbs || 1;
    const ratio = Math.max(0.12, Math.min(1, Math.abs(val) / maxVal));
    const alpha = (0.10 + ratio * 0.38) * intensity;

    if (val > 0) {
      return {
        backgroundColor: isLight ? `rgba(34, 197, 94, ${alpha})` : `rgba(34, 197, 94, ${alpha * 0.95})`,
        color: isLight ? '#14532d' : '#86efac',
        fontWeight: 700,
      };
    }
    return {
      backgroundColor: isLight ? `rgba(239, 68, 68, ${alpha})` : `rgba(239, 68, 68, ${alpha * 0.95})`,
      color: isLight ? '#7f1d1d' : '#fca5a5',
      fontWeight: 700,
    };
  };

  // 4. Change in Shorts (COT Convention Heatmap: Positive shorts increase = Red Bearish, Negative shorts reduction = Green Bullish)
  const getChangeShortsHeatmap = (val: number, maxAbs?: number) => {
    if (!val || val === 0) {
      return { color: isLight ? '#64748b' : '#94a3b8' };
    }
    const maxVal = maxAbs || 1;
    const ratio = Math.max(0.12, Math.min(1, Math.abs(val) / maxVal));
    const alpha = (0.10 + ratio * 0.38) * intensity;

    // Positive shorts addition = Bearish (Red)
    if (val > 0) {
      return {
        backgroundColor: isLight ? `rgba(239, 68, 68, ${alpha})` : `rgba(239, 68, 68, ${alpha * 0.95})`,
        color: isLight ? '#7f1d1d' : '#fca5a5',
        fontWeight: 700,
      };
    }
    // Negative shorts reduction (covering) = Bullish (Green)
    return {
      backgroundColor: isLight ? `rgba(34, 197, 94, ${alpha})` : `rgba(34, 197, 94, ${alpha * 0.95})`,
      color: isLight ? '#14532d' : '#86efac',
      fontWeight: 700,
    };
  };

  // 5. Net Positions (Full Bi-directional Divergent Heatmap: Positive = Green Net Long, Negative = Red Net Short)
  const getNetPositionsHeatmap = (net: number, maxAbs?: number) => {
    if (!net || net === 0) {
      return { color: isLight ? '#64748b' : '#94a3b8', fontWeight: 700 };
    }
    const maxVal = maxAbs || 1;
    const ratio = Math.max(0.14, Math.min(1, Math.abs(net) / maxVal));
    const alpha = (0.12 + ratio * 0.40) * intensity;

    if (net > 0) {
      return {
        backgroundColor: isLight ? `rgba(16, 185, 129, ${alpha})` : `rgba(16, 185, 129, ${alpha * 0.95})`,
        color: isLight ? '#064e3b' : '#6ee7b7',
        fontWeight: 800,
      };
    }
    return {
      backgroundColor: isLight ? `rgba(239, 68, 68, ${alpha})` : `rgba(239, 68, 68, ${alpha * 0.95})`,
      color: isLight ? '#7f1d1d' : '#fca5a5',
      fontWeight: 800,
    };
  };

  // 6. Spreads Contracts Heatmap (Purple/Violet gradient)
  const getSpreadContractsHeatmap = (val: number, range?: { min: number; max: number }) => {
    if (!range || range.max === range.min) return { color: isLight ? '#0f172a' : '#f8fafc' };
    const ratio = Math.max(0, Math.min(1, (val - range.min) / (range.max - range.min)));
    const alpha = (0.05 + ratio * 0.22) * intensity;
    return {
      backgroundColor: isLight ? `rgba(147, 51, 234, ${alpha})` : `rgba(147, 51, 234, ${alpha * 1.1})`,
      color: isLight ? '#581c87' : '#e9d5ff',
      fontWeight: 600,
    };
  };

  // 7. %OI Spreads Heatmap (Indigo/Cyan saturated gradient)
  const getSpreadPctHeatmap = (pct: number, range?: { min: number; max: number }) => {
    const span = range && range.max > range.min ? range.max - range.min : 30;
    const min = range ? range.min : 0;
    const ratio = Math.max(0, Math.min(1, (pct - min) / (span || 1)));
    const alpha = (0.10 + ratio * 0.38) * intensity;
    return {
      backgroundColor: isLight ? `rgba(99, 102, 241, ${alpha})` : `rgba(99, 102, 241, ${alpha * 0.95})`,
      color: isLight ? '#312e81' : '#c7d2fe',
      fontWeight: 700,
    };
  };

  // 8. %OI Longs Heatmap (Rich Emerald Green gradient)
  const getLongPctHeatmap = (pct: number, range?: { min: number; max: number }) => {
    const span = range && range.max > range.min ? range.max - range.min : 50;
    const min = range ? range.min : 0;
    const ratio = Math.max(0, Math.min(1, (pct - min) / (span || 1)));
    const alpha = (0.10 + ratio * 0.40) * intensity;
    return {
      backgroundColor: isLight ? `rgba(16, 185, 129, ${alpha})` : `rgba(16, 185, 129, ${alpha * 0.95})`,
      color: isLight ? '#064e3b' : '#6ee7b7',
      fontWeight: 700,
    };
  };

  // 9. %OI Shorts Heatmap (Rich Crimson Red gradient)
  const getShortPctHeatmap = (pct: number, range?: { min: number; max: number }) => {
    const span = range && range.max > range.min ? range.max - range.min : 50;
    const min = range ? range.min : 0;
    const ratio = Math.max(0, Math.min(1, (pct - min) / (span || 1)));
    const alpha = (0.10 + ratio * 0.40) * intensity;
    return {
      backgroundColor: isLight ? `rgba(239, 68, 68, ${alpha})` : `rgba(239, 68, 68, ${alpha * 0.95})`,
      color: isLight ? '#7f1d1d' : '#fca5a5',
      fontWeight: 700,
    };
  };

  // 10. Open Interest Total Heatmap (Electric Sapphire Blue gradient)
  const getOIHeatmap = (oi: number, range?: { min: number; max: number }) => {
    const span = range && range.max > range.min ? range.max - range.min : 1;
    const min = range ? range.min : 0;
    const ratio = Math.max(0, Math.min(1, (oi - min) / (span || 1)));
    const alpha = (0.08 + ratio * 0.38) * intensity;
    return {
      backgroundColor: isLight ? `rgba(2, 132, 199, ${alpha})` : `rgba(2, 132, 199, ${alpha * 0.95})`,
      color: isLight ? '#075985' : '#bae6fd',
      fontWeight: 700,
    };
  };

  // 11. Price Heatmap (Subtle warm gold/amber gradient)
  const getPriceHeatmap = (price: number | undefined | null, range?: { min: number; max: number }) => {
    if (price === undefined || price === null || !range || range.max === range.min) {
      return { color: isLight ? '#0f172a' : '#f8fafc', fontWeight: 700 };
    }
    const ratio = Math.max(0, Math.min(1, (price - range.min) / (range.max - range.min)));
    const alpha = (0.04 + ratio * 0.20) * intensity;
    return {
      backgroundColor: isLight ? `rgba(245, 158, 11, ${alpha})` : `rgba(245, 158, 11, ${alpha * 0.85})`,
      color: isLight ? '#0f172a' : '#f8fafc',
      fontWeight: 700,
    };
  };

  // Distinct category boundary divider styles
  const categoryDividers = {
    date: isLight ? '3px solid #cbd5e1' : '3px solid rgba(255, 255, 255, 0.22)',
    noncomm: isLight ? '3px solid #f87171' : '3px solid #ef4444',
    comm: isLight ? '3px solid #60a5fa' : '3px solid #3b82f6',
    nonrept: isLight ? '3px solid #2dd4bf' : '3px solid #14b8a6',
    internal: isLight ? '1px solid #e2e8f0' : '1px solid rgba(255, 255, 255, 0.08)',
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
      {/* ── Time Period, Heatmap & Export Controls Bar ────── */}
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
                      ? '#0d9488'
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

        {/* Right: Heatmap Intensity Toggle, Sort Order & CSV Export */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {/* Heatmap Mode Selector */}
          <button
            onClick={() => setHeatmapMode(heatmapMode === 'vibrant' ? 'subtle' : 'vibrant')}
            title="Toggle between vibrant institutional heatmap and subtle pastel shading"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              background: heatmapMode === 'vibrant'
                ? isLight ? '#ecfdf5' : '#064e3b'
                : isLight ? 'var(--surface-2)' : '#0f172a',
              border: heatmapMode === 'vibrant'
                ? isLight ? '1px solid #10b981' : '1px solid #059669'
                : isLight ? '1px solid var(--border-subtle)' : '1px solid rgba(51, 65, 85, 0.7)',
              color: heatmapMode === 'vibrant'
                ? isLight ? '#065f46' : '#6ee7b7'
                : isLight ? 'var(--text-primary)' : '#e2e8f0',
              padding: '6px 12px',
              borderRadius: 6,
              fontSize: '0.74rem',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: isLight ? 'var(--shadow-sm)' : 'none',
              transition: 'all 0.15s ease',
            }}
          >
            <Palette size={13} />
            <span>Heatmap: {heatmapMode === 'vibrant' ? 'Vibrant' : 'Subtle'}</span>
          </button>

          {/* Sort Chronological Direction */}
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

          {/* CSV Export */}
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
          maxWidth: '100%',
          background: isLight ? '#ffffff' : '#070b13',
          border: isLight ? '1px solid var(--border-subtle)' : '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: 8,
          boxShadow: isLight ? 'var(--shadow-sm)' : '0 8px 30px rgba(0,0,0,0.6)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
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
            borderBottom: isLight ? '1px solid #e2e8f0' : '1px solid rgba(255, 255, 255, 0.12)',
            flexWrap: 'wrap',
            gap: 8,
            boxSizing: 'border-box',
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
            overflowX: 'auto',
            overflowY: 'auto',
            maxHeight: 'calc(100vh - 220px)',
            minHeight: 480,
            borderBottom: isLight ? '1px solid #cbd5e1' : '1px solid rgba(255, 255, 255, 0.12)',
            WebkitOverflowScrolling: 'touch',
          }}
        >
          <table
            style={{
              minWidth: '100%',
              width: 'max-content',
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
                    borderRight: categoryDividers.date,
                    borderBottom: isLight ? '2px solid #cbd5e1' : '2px solid rgba(255, 255, 255, 0.2)',
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
                    color: isLight ? '#7f1d1d' : '#ffffff',
                    borderRight: categoryDividers.noncomm,
                    borderBottom: isLight ? '1px solid #fca5a5' : '1px solid rgba(255, 255, 255, 0.18)',
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
                    color: isLight ? '#1e3a8a' : '#ffffff',
                    borderRight: categoryDividers.comm,
                    borderBottom: isLight ? '1px solid #93c5fd' : '1px solid rgba(255, 255, 255, 0.18)',
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
                    borderRight: categoryDividers.nonrept,
                    borderBottom: isLight ? '1px solid #5eead4' : '1px solid rgba(255, 255, 255, 0.18)',
                    fontWeight: 900,
                    position: 'sticky',
                    top: 0,
                    zIndex: 20,
                  }}
                >
                  NON-REPORTABLE (SMALL SPECULATORS)
                </th>

                {/* OPEN INTEREST & PRICE Band (Sky Blue) */}
                <th
                  colSpan={2}
                  style={{
                    textAlign: 'center',
                    padding: '8px 10px',
                    background: isLight ? '#e0f2fe' : '#075985',
                    color: isLight ? '#0369a1' : '#ffffff',
                    borderBottom: isLight ? '1px solid #7dd3fc' : '1px solid rgba(255, 255, 255, 0.18)',
                    fontWeight: 900,
                    position: 'sticky',
                    top: 0,
                    zIndex: 20,
                  }}
                >
                  OPEN INTEREST
                </th>
              </tr>

              {/* Header Tier 2 (Sub-Columns with sticky top: 34px and razor-sharp contrast) */}
              <tr
                style={{
                  fontSize: '0.66rem',
                  fontWeight: 800,
                  borderBottom: isLight ? '2px solid #cbd5e1' : '2px solid rgba(255, 255, 255, 0.18)',
                }}
              >
                {/* Non-Commercial sub-columns */}
                <th style={{ padding: '6px 8px', background: isLight ? '#fef2f2' : '#991b1b', color: isLight ? '#7f1d1d' : '#ffffff', position: 'sticky', top: 34, zIndex: 20 }}>LONGS</th>
                <th style={{ padding: '6px 8px', background: isLight ? '#fef2f2' : '#991b1b', color: isLight ? '#7f1d1d' : '#ffffff', position: 'sticky', top: 34, zIndex: 20 }}>SHORTS</th>
                <th style={{ padding: '6px 8px', background: isLight ? '#fef2f2' : '#991b1b', color: isLight ? '#7f1d1d' : '#ffffff', position: 'sticky', top: 34, zIndex: 20 }}>CHANGE LONGS</th>
                <th style={{ padding: '6px 8px', background: isLight ? '#fef2f2' : '#991b1b', color: isLight ? '#7f1d1d' : '#ffffff', position: 'sticky', top: 34, zIndex: 20 }}>CHANGE SHORTS</th>
                <th style={{ padding: '6px 8px', background: isLight ? '#fecaca' : '#5b1212', color: isLight ? '#7f1d1d' : '#ffffff', fontWeight: 900, position: 'sticky', top: 34, zIndex: 20 }}>NET POSITIONS</th>
                <th style={{ padding: '6px 8px', background: isLight ? '#fef2f2' : '#991b1b', color: isLight ? '#7f1d1d' : '#ffffff', position: 'sticky', top: 34, zIndex: 20 }}>SPREADS</th>
                <th style={{ padding: '6px 8px', background: isLight ? '#fef2f2' : '#991b1b', color: isLight ? '#7f1d1d' : '#ffffff', position: 'sticky', top: 34, zIndex: 20 }}>%OI SPREADS</th>
                <th style={{ padding: '6px 8px', background: isLight ? '#fef2f2' : '#991b1b', color: isLight ? '#7f1d1d' : '#ffffff', position: 'sticky', top: 34, zIndex: 20 }}>%OI LONGS</th>
                <th style={{ padding: '6px 8px', background: isLight ? '#fef2f2' : '#991b1b', color: isLight ? '#7f1d1d' : '#ffffff', borderRight: categoryDividers.noncomm, position: 'sticky', top: 34, zIndex: 20 }}>%OI SHORTS</th>

                {/* Commercial sub-columns */}
                <th style={{ padding: '6px 8px', background: isLight ? '#eff6ff' : '#1d4ed8', color: isLight ? '#1e3a8a' : '#ffffff', position: 'sticky', top: 34, zIndex: 20 }}>LONGS</th>
                <th style={{ padding: '6px 8px', background: isLight ? '#eff6ff' : '#1d4ed8', color: isLight ? '#1e3a8a' : '#ffffff', position: 'sticky', top: 34, zIndex: 20 }}>SHORTS</th>
                <th style={{ padding: '6px 8px', background: isLight ? '#eff6ff' : '#1d4ed8', color: isLight ? '#1e3a8a' : '#ffffff', position: 'sticky', top: 34, zIndex: 20 }}>CHANGE LONGS</th>
                <th style={{ padding: '6px 8px', background: isLight ? '#eff6ff' : '#1d4ed8', color: isLight ? '#1e3a8a' : '#ffffff', position: 'sticky', top: 34, zIndex: 20 }}>CHANGE SHORTS</th>
                <th style={{ padding: '6px 8px', background: isLight ? '#bfdbfe' : '#172554', color: isLight ? '#1e3a8a' : '#ffffff', fontWeight: 900, position: 'sticky', top: 34, zIndex: 20 }}>NET POSITIONS</th>
                <th style={{ padding: '6px 8px', background: isLight ? '#eff6ff' : '#1d4ed8', color: isLight ? '#1e3a8a' : '#ffffff', position: 'sticky', top: 34, zIndex: 20 }}>%OI LONGS</th>
                <th style={{ padding: '6px 8px', background: isLight ? '#eff6ff' : '#1d4ed8', color: isLight ? '#1e3a8a' : '#ffffff', borderRight: categoryDividers.comm, position: 'sticky', top: 34, zIndex: 20 }}>%OI SHORTS</th>

                {/* Non-Reportable sub-columns */}
                <th style={{ padding: '6px 8px', background: isLight ? '#f0fdfa' : '#0f766e', color: isLight ? '#115e59' : '#ffffff', position: 'sticky', top: 34, zIndex: 20 }}>LONGS</th>
                <th style={{ padding: '6px 8px', background: isLight ? '#f0fdfa' : '#0f766e', color: isLight ? '#115e59' : '#ffffff', position: 'sticky', top: 34, zIndex: 20 }}>SHORTS</th>
                <th style={{ padding: '6px 8px', background: isLight ? '#f0fdfa' : '#0f766e', color: isLight ? '#115e59' : '#ffffff', position: 'sticky', top: 34, zIndex: 20 }}>CHANGE LONGS</th>
                <th style={{ padding: '6px 8px', background: isLight ? '#f0fdfa' : '#0f766e', color: isLight ? '#115e59' : '#ffffff', position: 'sticky', top: 34, zIndex: 20 }}>CHANGE SHORTS</th>
                <th style={{ padding: '6px 8px', background: isLight ? '#99f6e4' : '#042f2e', color: isLight ? '#115e59' : '#ffffff', fontWeight: 900, position: 'sticky', top: 34, zIndex: 20 }}>NET POSITIONS</th>
                <th style={{ padding: '6px 8px', background: isLight ? '#f0fdfa' : '#0f766e', color: isLight ? '#115e59' : '#ffffff', position: 'sticky', top: 34, zIndex: 20 }}>%OI LONGS</th>
                <th style={{ padding: '6px 8px', background: isLight ? '#f0fdfa' : '#0f766e', color: isLight ? '#115e59' : '#ffffff', borderRight: categoryDividers.nonrept, position: 'sticky', top: 34, zIndex: 20 }}>%OI SHORTS</th>

                {/* Open Interest sub-columns */}
                <th style={{ padding: '6px 8px', background: isLight ? '#f0f9ff' : '#0284c7', color: isLight ? '#075985' : '#ffffff', position: 'sticky', top: 34, zIndex: 20 }}>TOTAL</th>
                <th style={{ padding: '6px 8px', background: isLight ? '#f0f9ff' : '#0284c7', color: isLight ? '#075985' : '#ffffff', position: 'sticky', top: 34, zIndex: 20 }}>PRICE</th>
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
                          borderRight: categoryDividers.date,
                          backgroundColor: rowBg,
                          position: 'sticky',
                          left: 0,
                          zIndex: 10,
                        }}
                      >
                        {r.date_formatted}
                      </td>

                      {/* ── Non-Commercial (Large Speculators) ── */}
                      <td style={{ padding: '7px 8px', ...getLongContractsHeatmap(r.noncomm_long, stats?.noncomm_long) }}>
                        {formatNumber(r.noncomm_long)}
                      </td>
                      <td style={{ padding: '7px 8px', ...getShortContractsHeatmap(r.noncomm_short, stats?.noncomm_short) }}>
                        {formatNumber(r.noncomm_short)}
                      </td>
                      <td style={{ padding: '7px 8px', ...getChangeLongsHeatmap(r.change_noncomm_long, stats?.change_noncomm_long_abs) }}>
                        {formatSigned(r.change_noncomm_long)}
                      </td>
                      <td style={{ padding: '7px 8px', ...getChangeShortsHeatmap(r.change_noncomm_short, stats?.change_noncomm_short_abs) }}>
                        {formatSigned(r.change_noncomm_short)}
                      </td>
                      <td style={{ padding: '7px 8px', ...getNetPositionsHeatmap(r.noncomm_net, stats?.noncomm_net_abs) }}>
                        {formatNumber(r.noncomm_net)}
                      </td>
                      <td style={{ padding: '7px 8px', ...getSpreadContractsHeatmap(r.noncomm_spreading, stats?.noncomm_spreading) }}>
                        {formatNumber(r.noncomm_spreading)}
                      </td>
                      <td style={{ padding: '7px 8px', ...getSpreadPctHeatmap(r.pct_oi_noncomm_spreading, stats?.pct_oi_noncomm_spreading) }}>
                        {formatPercent(r.pct_oi_noncomm_spreading)}
                      </td>
                      <td style={{ padding: '7px 8px', ...getLongPctHeatmap(r.pct_oi_noncomm_long, stats?.pct_oi_noncomm_long) }}>
                        {formatPercent(r.pct_oi_noncomm_long)}
                      </td>
                      <td
                        style={{
                          padding: '7px 8px',
                          borderRight: categoryDividers.noncomm,
                          ...getShortPctHeatmap(r.pct_oi_noncomm_short, stats?.pct_oi_noncomm_short),
                        }}
                      >
                        {formatPercent(r.pct_oi_noncomm_short)}
                      </td>

                      {/* ── Commercial (Hedgers) ── */}
                      <td style={{ padding: '7px 8px', ...getLongContractsHeatmap(r.comm_long, stats?.comm_long) }}>
                        {formatNumber(r.comm_long)}
                      </td>
                      <td style={{ padding: '7px 8px', ...getShortContractsHeatmap(r.comm_short, stats?.comm_short) }}>
                        {formatNumber(r.comm_short)}
                      </td>
                      <td style={{ padding: '7px 8px', ...getChangeLongsHeatmap(r.change_comm_long, stats?.change_comm_long_abs) }}>
                        {formatSigned(r.change_comm_long)}
                      </td>
                      <td style={{ padding: '7px 8px', ...getChangeShortsHeatmap(r.change_comm_short, stats?.change_comm_short_abs) }}>
                        {formatSigned(r.change_comm_short)}
                      </td>
                      <td style={{ padding: '7px 8px', ...getNetPositionsHeatmap(r.comm_net, stats?.comm_net_abs) }}>
                        {formatNumber(r.comm_net)}
                      </td>
                      <td style={{ padding: '7px 8px', ...getLongPctHeatmap(r.pct_oi_comm_long, stats?.pct_oi_comm_long) }}>
                        {formatPercent(r.pct_oi_comm_long)}
                      </td>
                      <td
                        style={{
                          padding: '7px 8px',
                          borderRight: categoryDividers.comm,
                          ...getShortPctHeatmap(r.pct_oi_comm_short, stats?.pct_oi_comm_short),
                        }}
                      >
                        {formatPercent(r.pct_oi_comm_short)}
                      </td>

                      {/* ── Non-Reportable (Small Speculators) ── */}
                      <td style={{ padding: '7px 8px', ...getLongContractsHeatmap(r.nonrept_long, stats?.nonrept_long) }}>
                        {formatNumber(r.nonrept_long)}
                      </td>
                      <td style={{ padding: '7px 8px', ...getShortContractsHeatmap(r.nonrept_short, stats?.nonrept_short) }}>
                        {formatNumber(r.nonrept_short)}
                      </td>
                      <td style={{ padding: '7px 8px', ...getChangeLongsHeatmap(r.change_nonrept_long, stats?.change_nonrept_long_abs) }}>
                        {formatSigned(r.change_nonrept_long)}
                      </td>
                      <td style={{ padding: '7px 8px', ...getChangeShortsHeatmap(r.change_nonrept_short, stats?.change_nonrept_short_abs) }}>
                        {formatSigned(r.change_nonrept_short)}
                      </td>
                      <td style={{ padding: '7px 8px', ...getNetPositionsHeatmap(r.nonrept_net, stats?.nonrept_net_abs) }}>
                        {formatNumber(r.nonrept_net)}
                      </td>
                      <td style={{ padding: '7px 8px', ...getLongPctHeatmap(r.pct_oi_nonrept_long, stats?.pct_oi_nonrept_long) }}>
                        {formatPercent(r.pct_oi_nonrept_long)}
                      </td>
                      <td
                        style={{
                          padding: '7px 8px',
                          borderRight: categoryDividers.nonrept,
                          ...getShortPctHeatmap(r.pct_oi_nonrept_short, stats?.pct_oi_nonrept_short),
                        }}
                      >
                        {formatPercent(r.pct_oi_nonrept_short)}
                      </td>

                      {/* ── Open Interest & Price ── */}
                      <td style={{ padding: '7px 8px', ...getOIHeatmap(r.open_interest, stats?.open_interest) }}>
                        {formatNumber(r.open_interest)}
                      </td>
                      <td style={{ padding: '7px 8px', ...getPriceHeatmap(r.price, stats?.price) }}>
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
                color: isLight ? '#7f1d1d' : '#fecaca',
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
