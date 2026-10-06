import React, { useState, useMemo } from 'react';
import { Download, ArrowUpDown, ChevronUp, ChevronDown, Calendar, Layers, Shield, Users, BarChart3 } from 'lucide-react';
import { COTWeeklyBreakdownResponse, COTWeeklyBreakdownRow } from '../types/macro';

interface COTWeeklyBreakdownTableProps {
  data: COTWeeklyBreakdownResponse | null;
  loading: boolean;
  timeframe: string;
  onTimeframeChange: (tf: string) => void;
  isLight: boolean;
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
  isLight,
}) => {
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

  // Heatmap styling helpers
  const getSpreadHeatmap = (pct: number) => {
    const alpha = Math.min(0.45, Math.max(0.08, (pct / 40) * 0.4));
    return {
      backgroundColor: isLight ? `rgba(59, 130, 246, ${alpha * 0.9})` : `rgba(37, 99, 235, ${alpha})`,
      color: isLight ? '#1e3a8a' : '#bfdbfe',
    };
  };

  const getLongHeatmap = (pct: number) => {
    const alpha = Math.min(0.45, Math.max(0.08, (pct / 60) * 0.4));
    return {
      backgroundColor: isLight ? `rgba(16, 185, 129, ${alpha * 0.9})` : `rgba(5, 150, 105, ${alpha})`,
      color: isLight ? '#065f46' : '#a7f3d0',
    };
  };

  const getShortHeatmap = (pct: number) => {
    const alpha = Math.min(0.45, Math.max(0.08, (pct / 70) * 0.4));
    return {
      backgroundColor: isLight ? `rgba(239, 68, 68, ${alpha * 0.85})` : `rgba(220, 38, 38, ${alpha})`,
      color: isLight ? '#991b1b' : '#fecaca',
    };
  };

  const getOIHeatmap = (oi: number) => {
    const span = Math.max(1, maxOI - minOI);
    const ratio = Math.max(0, Math.min(1, (oi - minOI) / span));
    const alpha = 0.08 + ratio * 0.28;
    return {
      backgroundColor: isLight ? `rgba(2, 132, 199, ${alpha * 0.85})` : `rgba(14, 165, 233, ${alpha})`,
      color: isLight ? '#0369a1' : '#bae6fd',
    };
  };

  // Change coloring
  const getChangeStyle = (val: number) => {
    if (val > 0) {
      return {
        color: isLight ? '#15803d' : '#4ade80',
        fontWeight: 600,
      };
    }
    if (val < 0) {
      return {
        color: isLight ? '#dc2626' : '#f87171',
        fontWeight: 600,
      };
    }
    return {
      color: 'var(--text-muted)',
    };
  };

  // Net position badge styling
  const getNetStyle = (net: number, group: 'noncomm' | 'comm' | 'nonrept') => {
    const isPos = net > 0;
    if (group === 'noncomm') {
      return {
        backgroundColor: isPos
          ? isLight ? 'rgba(16, 185, 129, 0.18)' : 'rgba(16, 185, 129, 0.25)'
          : isLight ? 'rgba(239, 68, 68, 0.18)' : 'rgba(239, 68, 68, 0.25)',
        color: isPos
          ? isLight ? '#047857' : '#34d399'
          : isLight ? '#b91c1c' : '#f87171',
        fontWeight: 800,
      };
    }
    if (group === 'comm') {
      return {
        backgroundColor: isPos
          ? isLight ? 'rgba(16, 185, 129, 0.18)' : 'rgba(16, 185, 129, 0.22)'
          : isLight ? 'rgba(239, 68, 68, 0.18)' : 'rgba(239, 68, 68, 0.22)',
        color: isPos
          ? isLight ? '#047857' : '#34d399'
          : isLight ? '#b91c1c' : '#f87171',
        fontWeight: 800,
      };
    }
    // non-reportable
    return {
      backgroundColor: isPos
        ? isLight ? 'rgba(245, 158, 11, 0.18)' : 'rgba(245, 158, 11, 0.25)'
        : isLight ? 'rgba(239, 68, 68, 0.18)' : 'rgba(239, 68, 68, 0.25)',
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
      {/* ── Time Period & Export Controls Bar (Matching Screenshot Top) ────── */}
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
        }}
      >
        {/* Left: Time Period Selector Pills */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <span
            style={{
              fontSize: '0.72rem',
              fontWeight: 800,
              color: isLight ? 'var(--text-muted)' : '#94a3b8',
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
              padding: '5px 12px',
              borderRadius: 4,
              fontSize: '0.74rem',
              fontWeight: 600,
              cursor: 'pointer',
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
              padding: '5px 12px',
              borderRadius: 4,
              fontSize: '0.74rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <Download size={13} />
            <span>CSV</span>
          </button>
        </div>
      </div>

      {/* ── Table Top Brand Banner (Matching Screenshot Middle Banner) ───────── */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12,
          background: isLight
            ? 'linear-gradient(90deg, #092e39 0%, #064e5b 100%)'
            : 'linear-gradient(90deg, #06242c 0%, #0a3d4a 100%)',
          color: '#ffffff',
          padding: '10px 16px',
          borderRadius: 6,
          boxShadow: isLight ? '0 2px 6px rgba(0,0,0,0.08)' : '0 4px 16px rgba(0,0,0,0.4)',
        }}
      >
        {/* Left: Asset Title & Badges */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div
              style={{
                width: 26,
                height: 26,
                borderRadius: '50%',
                background: '#0d9488',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 10px rgba(13, 148, 136, 0.6)',
              }}
            >
              <BarChart3 size={15} color="#ffffff" />
            </div>
            <span style={{ fontSize: '0.95rem', fontWeight: 900, letterSpacing: '0.04em' }}>
              {data?.market.name || 'MARKET'} - {data?.market.exchange || 'EXCHANGE'}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', fontSize: '0.72rem' }}>
            <span style={{ background: 'rgba(0,0,0,0.3)', padding: '2px 8px', borderRadius: 4, fontFamily: 'monospace' }}>
              CFTC: <b style={{ color: '#2dd4bf' }}>{data?.market.cftc_code || '-'}</b>
            </span>
            <span style={{ background: 'rgba(0,0,0,0.3)', padding: '2px 8px', borderRadius: 4, fontFamily: 'monospace' }}>
              FUTURES TICKER: <b style={{ color: '#38bdf8' }}>{data?.market.ticker || '-'}</b>
            </span>
            {data?.market.contract_units && (
              <span style={{ background: 'rgba(0,0,0,0.3)', padding: '2px 8px', borderRadius: 4 }}>
                CONTRACT UNITS: <b>{data.market.contract_units}</b>
              </span>
            )}
            <span style={{ background: 'rgba(0,0,0,0.3)', padding: '2px 8px', borderRadius: 4 }}>
              EXCHANGE: <b>{data?.market.exchange || '-'}</b>
            </span>
            <span style={{ background: 'rgba(0,0,0,0.3)', padding: '2px 8px', borderRadius: 4 }}>
              DATE RANGE: <b>{data?.date_range_label || timeframe}</b>
            </span>
            <span style={{ background: 'rgba(0,0,0,0.3)', padding: '2px 8px', borderRadius: 4 }}>
              RECORDS: <b style={{ color: '#fef08a' }}>{data?.records_count || rows.length} Reports</b>
            </span>
          </div>
        </div>

        {/* Right: Badge */}
        <div style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 600 }}>
          COT-Reports Institutional Engine
        </div>
      </div>

      {/* ── The Comprehensive Multi-tier Data Table Container ───────────────── */}
      <div
        style={{
          width: '100%',
          overflowX: 'auto',
          background: isLight ? '#ffffff' : '#070b13',
          border: isLight ? '1px solid var(--border-subtle)' : '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: 8,
          boxShadow: isLight ? '0 1px 4px rgba(0,0,0,0.06)' : '0 8px 30px rgba(0,0,0,0.6)',
        }}
      >
        {/* Table Title Bar */}
        <div
          style={{
            background: isLight ? '#1f2937' : '#0c1424',
            color: '#f8fafc',
            padding: '8px 16px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: isLight ? '1px solid #374151' : '1px solid rgba(255, 255, 255, 0.1)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: '0.9rem', fontWeight: 900, letterSpacing: '0.05em' }}>
              {data?.market.name || 'SILVER'} - {data?.market.exchange || 'COMEX'}
            </span>
          </div>
          {data?.market.contract_units && (
            <div style={{ fontSize: '0.72rem', color: '#94a3b8', fontFamily: 'monospace' }}>
              CONTRACTS OF {data.market.contract_units.toUpperCase()}
            </div>
          )}
        </div>

        {/* Main Table */}
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontSize: '0.72rem',
            textAlign: 'right',
            whiteSpace: 'nowrap',
          }}
        >
          {/* Header Tier 1 (Category Groups) */}
          <thead>
            <tr
              style={{
                fontSize: '0.7rem',
                fontWeight: 900,
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
                color: '#ffffff',
              }}
            >
              <th
                rowSpan={2}
                style={{
                  textAlign: 'left',
                  padding: '10px 14px',
                  background: isLight ? '#111827' : '#080d1a',
                  borderRight: isLight ? '1px solid #374151' : '1px solid rgba(255, 255, 255, 0.12)',
                  position: 'sticky',
                  left: 0,
                  zIndex: 2,
                  minWidth: 105,
                }}
              >
                DATE
              </th>

              {/* NON-COMMERCIAL Header Band (Red/Crimson) */}
              <th
                colSpan={9}
                style={{
                  textAlign: 'center',
                  padding: '7px 10px',
                  background: isLight ? '#991b1b' : '#7f1d1d',
                  borderRight: isLight ? '1px solid #374151' : '1px solid rgba(255, 255, 255, 0.12)',
                  borderBottom: '1px solid rgba(255, 255, 255, 0.15)',
                }}
              >
                NON-COMMERCIAL (LARGE SPECULATORS)
              </th>

              {/* COMMERCIAL Header Band (Royal Blue) */}
              <th
                colSpan={7}
                style={{
                  textAlign: 'center',
                  padding: '7px 10px',
                  background: isLight ? '#1e40af' : '#1e3a8a',
                  borderRight: isLight ? '1px solid #374151' : '1px solid rgba(255, 255, 255, 0.12)',
                  borderBottom: '1px solid rgba(255, 255, 255, 0.15)',
                }}
              >
                COMMERCIAL (HEDGERS)
              </th>

              {/* NON-REPORTABLE Header Band (Teal/Slate) */}
              <th
                colSpan={7}
                style={{
                  textAlign: 'center',
                  padding: '7px 10px',
                  background: isLight ? '#0f766e' : '#134e4a',
                  borderRight: isLight ? '1px solid #374151' : '1px solid rgba(255, 255, 255, 0.12)',
                  borderBottom: '1px solid rgba(255, 255, 255, 0.15)',
                }}
              >
                NON-REPORTABLE (SMALL SPECULATORS)
              </th>

              {/* OPEN INTEREST & PRICE Band */}
              <th
                colSpan={2}
                style={{
                  textAlign: 'center',
                  padding: '7px 10px',
                  background: isLight ? '#0369a1' : '#075985',
                  borderBottom: '1px solid rgba(255, 255, 255, 0.15)',
                }}
              >
                OPEN INTEREST
              </th>
            </tr>

            {/* Header Tier 2 (Sub-Columns) */}
            <tr
              style={{
                fontSize: '0.66rem',
                fontWeight: 800,
                color: '#ffffff',
                borderBottom: isLight ? '2px solid #374151' : '2px solid rgba(255, 255, 255, 0.15)',
              }}
            >
              {/* Non-Commercial sub-columns */}
              <th style={{ padding: '6px 8px', background: isLight ? '#b91c1c' : '#991b1b' }}>LONGS</th>
              <th style={{ padding: '6px 8px', background: isLight ? '#b91c1c' : '#991b1b' }}>SHORTS</th>
              <th style={{ padding: '6px 8px', background: isLight ? '#b91c1c' : '#991b1b' }}>CHANGE LONGS</th>
              <th style={{ padding: '6px 8px', background: isLight ? '#b91c1c' : '#991b1b' }}>CHANGE SHORTS</th>
              <th style={{ padding: '6px 8px', background: isLight ? '#7f1d1d' : '#5b1212', fontWeight: 900 }}>NET POSITIONS</th>
              <th style={{ padding: '6px 8px', background: isLight ? '#b91c1c' : '#991b1b' }}>SPREADS</th>
              <th style={{ padding: '6px 8px', background: isLight ? '#b91c1c' : '#991b1b' }}>%OI SPREADS</th>
              <th style={{ padding: '6px 8px', background: isLight ? '#b91c1c' : '#991b1b' }}>%OI LONGS</th>
              <th style={{ padding: '6px 8px', background: isLight ? '#b91c1c' : '#991b1b', borderRight: isLight ? '1px solid #374151' : '1px solid rgba(255,255,255,0.15)' }}>%OI SHORTS</th>

              {/* Commercial sub-columns */}
              <th style={{ padding: '6px 8px', background: isLight ? '#2563eb' : '#1e40af' }}>LONGS</th>
              <th style={{ padding: '6px 8px', background: isLight ? '#2563eb' : '#1e40af' }}>SHORTS</th>
              <th style={{ padding: '6px 8px', background: isLight ? '#2563eb' : '#1e40af' }}>CHANGE LONGS</th>
              <th style={{ padding: '6px 8px', background: isLight ? '#2563eb' : '#1e40af' }}>CHANGE SHORTS</th>
              <th style={{ padding: '6px 8px', background: isLight ? '#1e3a8a' : '#172554', fontWeight: 900 }}>NET POSITIONS</th>
              <th style={{ padding: '6px 8px', background: isLight ? '#2563eb' : '#1e40af' }}>%OI LONGS</th>
              <th style={{ padding: '6px 8px', background: isLight ? '#2563eb' : '#1e40af', borderRight: isLight ? '1px solid #374151' : '1px solid rgba(255,255,255,0.15)' }}>%OI SHORTS</th>

              {/* Non-Reportable sub-columns */}
              <th style={{ padding: '6px 8px', background: isLight ? '#0d9488' : '#0f766e' }}>LONGS</th>
              <th style={{ padding: '6px 8px', background: isLight ? '#0d9488' : '#0f766e' }}>SHORTS</th>
              <th style={{ padding: '6px 8px', background: isLight ? '#0d9488' : '#0f766e' }}>CHANGE LONGS</th>
              <th style={{ padding: '6px 8px', background: isLight ? '#0d9488' : '#0f766e' }}>CHANGE SHORTS</th>
              <th style={{ padding: '6px 8px', background: isLight ? '#115e59' : '#042f2e', fontWeight: 900 }}>NET POSITIONS</th>
              <th style={{ padding: '6px 8px', background: isLight ? '#0d9488' : '#0f766e' }}>%OI LONGS</th>
              <th style={{ padding: '6px 8px', background: isLight ? '#0d9488' : '#0f766e', borderRight: isLight ? '1px solid #374151' : '1px solid rgba(255,255,255,0.15)' }}>%OI SHORTS</th>

              {/* Open Interest sub-columns */}
              <th style={{ padding: '6px 8px', background: isLight ? '#0284c7' : '#0369a1' }}>TOTAL</th>
              <th style={{ padding: '6px 8px', background: isLight ? '#0284c7' : '#0369a1' }}>PRICE</th>
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
                        zIndex: 1,
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
                    <td style={{ padding: '7px 8px', fontWeight: 700, ...getOIHeatmap(r.open_interest) }}>
                      {formatNumber(r.open_interest)}
                    </td>
                    <td style={{ padding: '7px 8px', color: isLight ? '#0f172a' : '#f8fafc', fontWeight: 600 }}>
                      {formatPrice(r.price)}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        {/* ── Table Footer Status Bar (Matching Screenshot Bottom) ───────────── */}
        <div
          style={{
            background: isLight ? '#0f172a' : '#04070d',
            color: '#f8fafc',
            padding: '10px 16px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 12,
            borderTop: isLight ? '1px solid #334155' : '1px solid rgba(255, 255, 255, 0.1)',
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
                borderRadius: 3,
                fontSize: '0.68rem',
                fontWeight: 900,
                letterSpacing: '0.04em',
              }}
            >
              NEXT RELEASE: {data?.next_release_date || 'Oct 9, 2026'}
            </span>
            <span style={{ color: '#94a3b8' }}>
              CFTC releases weekly every Friday at 3:30 PM ET
            </span>
          </div>

          {/* Center: Group Badges Legend */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span
              style={{
                background: isLight ? '#991b1b' : '#7f1d1d',
                color: '#fecaca',
                padding: '2px 8px',
                borderRadius: 3,
                fontSize: '0.66rem',
                fontWeight: 800,
              }}
            >
              NON-COMMERCIAL (LARGE SPECULATORS)
            </span>
            <span
              style={{
                background: isLight ? '#1e40af' : '#1e3a8a',
                color: '#bfdbfe',
                padding: '2px 8px',
                borderRadius: 3,
                fontSize: '0.66rem',
                fontWeight: 800,
              }}
            >
              COMMERCIAL (HEDGERS)
            </span>
            <span
              style={{
                background: isLight ? '#0f766e' : '#134e4a',
                color: '#a7f3d0',
                padding: '2px 8px',
                borderRadius: 3,
                fontSize: '0.66rem',
                fontWeight: 800,
              }}
            >
              NON-REPORTABLE (SMALL SPECULATORS)
            </span>
            <span
              style={{
                background: isLight ? '#0369a1' : '#075985',
                color: '#bae6fd',
                padding: '2px 8px',
                borderRadius: 3,
                fontSize: '0.66rem',
                fontWeight: 800,
              }}
            >
              TOTAL OPEN INTEREST
            </span>
          </div>

          {/* Right: Signature */}
          <div style={{ color: '#64748b', fontSize: '0.68rem' }}>
            An original format by COT-Reports.com • Institutional Integration
          </div>
        </div>
      </div>
    </div>
  );
};
