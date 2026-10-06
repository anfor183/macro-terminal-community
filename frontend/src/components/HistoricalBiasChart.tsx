import React, { useState, useEffect, useMemo } from 'react';

export interface ScoreHistoryPoint {
  timestamp: string;
  score: number;
  weekly_score?: number;
  tactical_bias?: string;
  confidence?: number;
  catalyst?: string;
}

interface HistoricalBiasChartProps {
  history?: ScoreHistoryPoint[];
  symbol?: string;
  height?: number;
  width?: number;
}

export const HistoricalBiasChart: React.FC<HistoricalBiasChartProps> = ({
  history = [],
  symbol = 'EURUSD',
  height = 280,
  width = 720,
}) => {
  const [hoveredPoint, setHoveredPoint] = useState<ScoreHistoryPoint | null>(null);
  const [hoverX, setHoverX] = useState<number | null>(null);

  // Live reactive light mode detection
  const [isLight, setIsLight] = useState<boolean>(() => {
    if (typeof document !== 'undefined') {
      return document.documentElement.getAttribute('data-theme') === 'light';
    }
    return false;
  });

  useEffect(() => {
    const checkTheme = () => {
      setIsLight(document.documentElement.getAttribute('data-theme') === 'light');
    };
    checkTheme();
    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => observer.disconnect();
  }, []);

  // Generate fallback points if empty
  const points: ScoreHistoryPoint[] = useMemo(() => {
    if (history.length > 0) return history;
    return [
      { timestamp: '2026-04-14', score: 28, tactical_bias: 'MILD BULLISH', confidence: 78, catalyst: 'ECB policy hold' },
      { timestamp: '2026-05-12', score: 35, tactical_bias: 'BULLISH', confidence: 80, catalyst: 'Eurozone PMI beats estimates' },
      { timestamp: '2026-06-16', score: 42, tactical_bias: 'BULLISH', confidence: 82, catalyst: 'US Core CPI disinflation' },
      { timestamp: '2026-07-21', score: 38, tactical_bias: 'BULLISH', confidence: 81, catalyst: 'Federal Reserve guidance' },
      { timestamp: '2026-08-18', score: 51, tactical_bias: 'BULLISH', confidence: 83, catalyst: 'Jackson Hole dovish confirmation' },
      { timestamp: '2026-09-15', score: 58, tactical_bias: 'BULLISH', confidence: 85, catalyst: 'US Yield compression' },
      { timestamp: '2026-10-06', score: 61, tactical_bias: 'BULLISH', confidence: 84, catalyst: 'Macro liquidity acceleration' },
    ];
  }, [history]);

  const padding = { top: 25, right: 35, bottom: 38, left: 45 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  // Score mapping: -100 is bottom (chartH), 0 is middle (chartH/2), +100 is top (0)
  const getY = (score: number) => {
    const clamped = Math.max(-100, Math.min(100, score));
    return padding.top + chartH - ((clamped + 100) / 200) * chartH;
  };

  const getX = (index: number) => {
    if (points.length <= 1) return padding.left + chartW / 2;
    return padding.left + (index / (points.length - 1)) * chartW;
  };

  // Build SVG path
  const linePath = useMemo(() => {
    return points.reduce((acc, pt, idx) => {
      const x = getX(idx);
      const y = getY(pt.score);
      return idx === 0 ? `M ${x.toFixed(1)} ${y.toFixed(1)}` : `${acc} L ${x.toFixed(1)} ${y.toFixed(1)}`;
    }, '');
  }, [points]);

  // Area under path down to zero line
  const zeroY = getY(0);
  const firstX = getX(0);
  const lastX = getX(points.length - 1);
  const areaPath = `${linePath} L ${lastX} ${zeroY} L ${firstX} ${zeroY} Z`;

  // Shaded threshold zones
  const zones = useMemo(() => [
    { label: 'STR BULL (+70)', yTop: getY(100), yBot: getY(70), fill: isLight ? 'rgba(16, 185, 129, 0.08)' : 'rgba(16, 185, 129, 0.06)' },
    { label: 'BULL (+30)', yTop: getY(70), yBot: getY(30), fill: isLight ? 'rgba(16, 185, 129, 0.04)' : 'rgba(16, 185, 129, 0.03)' },
    { label: 'NEUTRAL (±10)', yTop: getY(10), yBot: getY(-10), fill: isLight ? 'rgba(148, 163, 184, 0.05)' : 'rgba(148, 163, 184, 0.03)' },
    { label: 'BEAR (-30)', yTop: getY(-30), yBot: getY(-70), fill: isLight ? 'rgba(239, 68, 68, 0.04)' : 'rgba(239, 68, 68, 0.03)' },
    { label: 'STR BEAR (-70)', yTop: getY(-70), yBot: getY(-100), fill: isLight ? 'rgba(239, 68, 68, 0.08)' : 'rgba(239, 68, 68, 0.06)' },
  ], [isLight]);

  // Select 5 cleanly spaced tick indices along X axis to guarantee ZERO text collision
  const tickIndices = useMemo(() => {
    if (points.length <= 6) return points.map((_, i) => i);
    const count = 5;
    const step = (points.length - 1) / (count - 1);
    const indices = Array.from({ length: count }, (_, i) => Math.round(i * step));
    return Array.from(new Set(indices)).sort((a, b) => a - b);
  }, [points.length]);

  const formatDateLabel = (isoDate: string, isLast: boolean) => {
    if (isLast) return 'Today';
    try {
      const parts = isoDate.split('-');
      if (parts.length === 3) {
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const m = parseInt(parts[1], 10) - 1;
        const d = parseInt(parts[2], 10);
        return `${monthNames[m]} ${d}`;
      }
      const d = new Date(isoDate);
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch {
      return isoDate;
    }
  };

  return (
    <div
      style={{
        background: 'var(--surface-1)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-md)',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
      }}
    >
      {/* Title & Legend Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 8,
          flexWrap: 'wrap',
          gap: 8,
        }}
      >
        <div>
          <div
            style={{
              fontSize: '0.78rem',
              fontWeight: 800,
              letterSpacing: '0.06em',
              color: isLight ? '#0369a1' : 'var(--text-primary)',
              textTransform: 'uppercase',
            }}
          >
            Historical Fundamental Bias & Macro Trajectory
          </div>
          <div style={{ fontSize: '0.73rem', color: 'var(--text-muted)' }}>
            {symbol} Quantitative Score Progression with Catalyst Overlays
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 14, fontSize: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: isLight ? '#15803d' : '#10b981' }} />
            <span style={{ color: 'var(--text-secondary)' }}>Bullish Band</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: isLight ? '#dc2626' : '#ef4444' }} />
            <span style={{ color: 'var(--text-secondary)' }}>Bearish Band</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                border: isLight ? '1.5px solid #d97706' : '1.5px solid #f59e0b',
                background: 'transparent',
                display: 'inline-block',
              }}
            />
            <span style={{ color: 'var(--text-secondary)' }}>Catalyst Pin</span>
          </div>
        </div>
      </div>

      {/* SVG Canvas */}
      <div style={{ position: 'relative' }}>
        <svg
          viewBox={`0 0 ${width} ${height}`}
          style={{ width: '100%', height: 'auto', overflow: 'visible' }}
          onMouseLeave={() => {
            setHoveredPoint(null);
            setHoverX(null);
          }}
        >
          <defs>
            <linearGradient id="scoreAreaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={isLight ? '#0284c7' : '#06b6d4'} stopOpacity={isLight ? 0.2 : 0.25} />
              <stop offset="100%" stopColor={isLight ? '#0284c7' : '#06b6d4'} stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Background Shaded Zones */}
          {zones.map((z, idx) => (
            <rect
              key={`zone-${idx}`}
              x={padding.left}
              y={z.yTop}
              width={chartW}
              height={Math.max(0, z.yBot - z.yTop)}
              fill={z.fill}
            />
          ))}

          {/* Horizontal Grid Ticks & Labels */}
          {[-100, -70, -30, 0, 30, 70, 100].map((val) => {
            const y = getY(val);
            const isZero = val === 0;
            return (
              <g key={`grid-val-${val}`}>
                <line
                  x1={padding.left}
                  y1={y}
                  x2={padding.left + chartW}
                  y2={y}
                  stroke={isZero ? (isLight ? 'rgba(2, 132, 199, 0.45)' : 'rgba(56, 189, 248, 0.5)') : 'var(--border-subtle)'}
                  strokeWidth={isZero ? 1.4 : 0.6}
                  strokeDasharray={isZero ? 'none' : '3 3'}
                />
                <text
                  x={padding.left - 8}
                  y={y + 3.5}
                  textAnchor="end"
                  fontSize="8.5"
                  fontFamily="'JetBrains Mono', monospace"
                  fill={isZero ? (isLight ? '#0284c7' : '#38bdf8') : 'var(--text-secondary)'}
                  fontWeight={isZero ? 700 : 500}
                >
                  {val > 0 ? `+${val}` : val}
                </text>
              </g>
            );
          })}

          {/* Area Fill */}
          <path d={areaPath} fill="url(#scoreAreaGrad)" />

          {/* Time Series Score Line */}
          <path
            d={linePath}
            fill="none"
            stroke={isLight ? '#0284c7' : '#06b6d4'}
            strokeWidth={2.6}
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Point markers & Catalyst pins */}
          {points.map((pt, idx) => {
            const x = getX(idx);
            const y = getY(pt.score);
            const isHovered = hoveredPoint === pt;
            const hasCatalyst = Boolean(pt.catalyst);

            return (
              <g key={`pt-${idx}`}>
                {/* Catalyst marker line & pin ring */}
                {hasCatalyst && (
                  <g pointerEvents="none">
                    <line
                      x1={x}
                      y1={y}
                      x2={x}
                      y2={padding.top + chartH}
                      stroke={isLight ? 'rgba(217, 119, 6, 0.5)' : 'rgba(245, 158, 11, 0.45)'}
                      strokeWidth={1.2}
                      strokeDasharray="2 2"
                    />
                    <circle
                      cx={x}
                      cy={y}
                      r={7}
                      fill="none"
                      stroke={isLight ? '#d97706' : '#f59e0b'}
                      strokeWidth={1.5}
                      opacity={0.85}
                    />
                  </g>
                )}

                {/* Score Point Node */}
                <circle
                  cx={x}
                  cy={y}
                  r={isHovered ? 6 : hasCatalyst ? 4.5 : 3.5}
                  fill={pt.score >= 0 ? (isLight ? '#15803d' : '#10b981') : (isLight ? '#dc2626' : '#ef4444')}
                  stroke={isLight ? '#ffffff' : '#030712'}
                  strokeWidth={2}
                  style={{ cursor: 'pointer', transition: 'all 0.15s ease' }}
                  onMouseEnter={() => {
                    setHoveredPoint(pt);
                    setHoverX(x);
                  }}
                />
              </g>
            );
          })}

          {/* Clean Non-Overlapping X-Axis Date Labels */}
          {tickIndices.map((idx) => {
            const pt = points[idx];
            if (!pt) return null;
            const x = getX(idx);
            const isLast = idx === points.length - 1;
            return (
              <g key={`x-tick-${idx}`}>
                <line
                  x1={x}
                  y1={padding.top + chartH}
                  x2={x}
                  y2={padding.top + chartH + 5}
                  stroke={isLight ? 'var(--border-active)' : 'var(--border-subtle)'}
                  strokeWidth={1}
                />
                <text
                  x={x}
                  y={padding.top + chartH + 18}
                  textAnchor="middle"
                  fontSize="9"
                  fontFamily="'Inter', -apple-system, sans-serif"
                  fill={isLast ? (isLight ? '#0284c7' : '#38bdf8') : 'var(--text-secondary)'}
                  fontWeight={isLast ? 700 : 500}
                >
                  {formatDateLabel(pt.timestamp, isLast)}
                </text>
              </g>
            );
          })}

          {/* Vertical Crosshair Line on hover */}
          {hoverX !== null && (
            <line
              x1={hoverX}
              y1={padding.top}
              x2={hoverX}
              y2={padding.top + chartH}
              stroke={isLight ? 'rgba(2, 132, 199, 0.6)' : 'rgba(56, 189, 248, 0.6)'}
              strokeWidth={1}
              strokeDasharray="3 2"
              pointerEvents="none"
            />
          )}
        </svg>

        {/* Floating Tooltip Box */}
        {hoveredPoint && (
          <div
            style={{
              position: 'absolute',
              top: 10,
              right: 15,
              background: isLight ? 'rgba(255, 255, 255, 0.98)' : 'var(--surface-elevated)',
              border: '1px solid var(--border-active)',
              borderRadius: 'var(--radius-sm)',
              padding: '10px 14px',
              fontSize: '0.75rem',
              boxShadow: isLight ? '0 10px 25px rgba(0,0,0,0.1)' : 'var(--shadow-md)',
              pointerEvents: 'none',
              backdropFilter: 'blur(10px)',
              minWidth: 230,
              maxWidth: 320,
              zIndex: 30,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', fontWeight: 600 }}>
                {hoveredPoint.timestamp}
              </span>
              <span
                style={{
                  fontSize: '0.7rem',
                  fontWeight: 800,
                  padding: '2px 7px',
                  borderRadius: 3,
                  background: hoveredPoint.score >= 0
                    ? (isLight ? 'rgba(22, 163, 74, 0.12)' : 'rgba(16, 185, 129, 0.2)')
                    : (isLight ? 'rgba(220, 38, 38, 0.12)' : 'rgba(239, 68, 68, 0.2)'),
                  color: hoveredPoint.score >= 0
                    ? (isLight ? '#15803d' : '#34d399')
                    : (isLight ? '#dc2626' : '#f87171'),
                }}
              >
                {hoveredPoint.tactical_bias || 'MODEL BIAS'}
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 4 }}>
              <span style={{ color: 'var(--text-secondary)' }}>Macro Score:</span>
              <span
                className="mono"
                style={{
                  fontSize: '1.05rem',
                  fontWeight: 800,
                  color: hoveredPoint.score >= 0
                    ? (isLight ? '#15803d' : '#10b981')
                    : (isLight ? '#dc2626' : '#ef4444'),
                }}
              >
                {hoveredPoint.score > 0 ? `+${hoveredPoint.score.toFixed(1)}` : hoveredPoint.score.toFixed(1)}
              </span>
            </div>

            {hoveredPoint.confidence && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 3 }}>
                <span style={{ color: 'var(--text-muted)' }}>Confidence:</span>
                <span className="mono" style={{ color: isLight ? '#0284c7' : '#38bdf8', fontWeight: 600 }}>
                  {hoveredPoint.confidence}%
                </span>
              </div>
            )}

            {hoveredPoint.catalyst && (
              <div
                style={{
                  marginTop: 8,
                  paddingTop: 8,
                  borderTop: '1px solid var(--border-subtle)',
                  color: isLight ? '#b45309' : '#fbbf24',
                  fontSize: '0.74rem',
                  lineHeight: 1.35,
                }}
              >
                <div style={{ fontWeight: 700, marginBottom: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span>⚡ Macro Catalyst:</span>
                </div>
                <div style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
                  {hoveredPoint.catalyst}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
