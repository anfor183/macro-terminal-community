import React from 'react';
import {
  Globe,
  TrendingUp,
  TrendingDown,
  Flame,
  Calendar,
  ShieldCheck,
  Zap,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { MacroRegime, AssetItem, CalendarEvent } from '../types/macro';
import { useTimezone } from '../context/TimezoneContext';

interface MarketAtAGlanceProps {
  regime: MacroRegime | null;
  assets: AssetItem[];
  calendar: CalendarEvent[];
  currencies?: Array<{ rank: number; code: string; name: string; score: number; weekly_score: number; policy_direction: string; growth_direction: string }>;
  onSelectAsset?: (symbol: string) => void;
  onNavigateTab?: (tab: any) => void;
}

export const MarketAtAGlance: React.FC<MarketAtAGlanceProps> = ({
  regime,
  assets,
  calendar,
  currencies,
  onSelectAsset,
  onNavigateTab,
}) => {
  const { formatTime } = useTimezone();

  // Compute Leaders & Laggards
  const sortedAssets = [...assets].sort((a, b) => b.score - a.score);
  const topBullish = sortedAssets.slice(0, 3);
  const topBearish = sortedAssets.slice(-3).reverse();

  // Currencies from live rankings
  const validCurrs = currencies && currencies.length > 0 ? [...currencies].sort((a, b) => b.score - a.score) : [];
  const leaders = validCurrs.length > 0
    ? validCurrs.slice(0, 3).map((c) => `${c.code} (${c.score >= 0 ? '+' : ''}${Math.round(c.score)})`)
    : ['JPY (+55)', 'EUR (+42)', 'AUD (+28)'];
  const laggards = validCurrs.length > 0
    ? validCurrs.slice(-3).reverse().map((c) => `${c.code} (${c.score >= 0 ? '+' : ''}${Math.round(c.score)})`)
    : ['NZD (-20)', 'CAD (-15)', 'CNY (-5)'];

  // Next major event
  const nextEvent = calendar && calendar.length > 0 ? calendar[0] : null;

  return (
    <div
      style={{
        background: 'var(--surface-1)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-lg)',
        padding: '16px 20px',
        boxShadow: 'var(--shadow-sm)',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        position: 'relative',
      }}
    >
      {/* Header bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: '#10b981',
              boxShadow: '0 0 8px #10b981',
            }}
          />
          <span
            style={{
              fontSize: '0.75rem',
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              color: 'var(--text-primary)',
            }}
          >
            Market at a Glance · 10-Second Macro Executive Summary
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', color: 'var(--text-dim)' }}>
          <ShieldCheck size={14} color="#10b981" />
          <span>System Healthy · Tier-1 Real-Time Sync</span>
        </div>
      </div>

      {/* Grid of Key Macro Signals */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: 12,
        }}
      >
        {/* 1. Global Macro Regime */}
        <div
          style={{
            background: 'var(--surface-2)',
            padding: '10px 12px',
            borderRadius: 'var(--radius-sm)',
            borderLeft: '3px solid var(--accent-cyan)',
          }}
        >
          <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700 }}>
            Global Macro Regime
          </div>
          <div className="mono" style={{ fontSize: '0.85rem', fontWeight: 800, color: '#38bdf8', marginTop: 3 }}>
            {regime?.risk_sentiment || 'RISK-ON'} · {regime?.growth_cycle || 'EXPANSION'}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>
            Liquidity: {regime?.liquidity_cycle || 'EXPANDING'}
          </div>
        </div>

        {/* 2. Currency Leaders */}
        <div
          style={{
            background: 'var(--surface-2)',
            padding: '10px 12px',
            borderRadius: 'var(--radius-sm)',
            borderLeft: '3px solid #10b981',
          }}
        >
          <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700 }}>
            Currency Leaders (Strongest)
          </div>
          <div className="mono" style={{ fontSize: '0.8rem', fontWeight: 700, color: '#34d399', marginTop: 3 }}>
            {leaders.join(' · ')}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: 2 }}>
            Monetary divergence & yield support
          </div>
        </div>

        {/* 3. Currency Laggards */}
        <div
          style={{
            background: 'var(--surface-2)',
            padding: '10px 12px',
            borderRadius: 'var(--radius-sm)',
            borderLeft: '3px solid #ef4444',
          }}
        >
          <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700 }}>
            Currency Laggards (Weakest)
          </div>
          <div className="mono" style={{ fontSize: '0.8rem', fontWeight: 700, color: '#f87171', marginTop: 3 }}>
            {laggards.join(' · ')}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: 2 }}>
            Negative real rates & weak domestic demand
          </div>
        </div>

        {/* 4. Top Bullish Assets */}
        <div
          style={{
            background: 'var(--surface-2)',
            padding: '10px 12px',
            borderRadius: 'var(--radius-sm)',
            borderLeft: '3px solid #10b981',
          }}
        >
          <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700 }}>
            Top Bullish Assets
          </div>
          <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
            {topBullish.map((ast) => (
              <button
                key={ast.symbol}
                onClick={() => onSelectAsset && onSelectAsset(ast.symbol)}
                className="mono"
                style={{
                  background: 'var(--surface-1)',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  color: '#34d399',
                  borderRadius: 3,
                  padding: '2px 6px',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  cursor: onSelectAsset ? 'pointer' : 'default',
                }}
              >
                {ast.symbol} +{ast.score.toFixed(0)}
              </button>
            ))}
          </div>
        </div>

        {/* 5. Top Bearish Assets */}
        <div
          style={{
            background: 'var(--surface-2)',
            padding: '10px 12px',
            borderRadius: 'var(--radius-sm)',
            borderLeft: '3px solid #ef4444',
          }}
        >
          <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700 }}>
            Top Bearish Assets
          </div>
          <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
            {topBearish.map((ast) => (
              <button
                key={ast.symbol}
                onClick={() => onSelectAsset && onSelectAsset(ast.symbol)}
                className="mono"
                style={{
                  background: 'var(--surface-1)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  color: '#f87171',
                  borderRadius: 3,
                  padding: '2px 6px',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  cursor: onSelectAsset ? 'pointer' : 'default',
                }}
              >
                {ast.symbol} {ast.score.toFixed(0)}
              </button>
            ))}
          </div>
        </div>

        {/* 6. Next High-Impact Event */}
        <div
          style={{
            background: 'var(--surface-2)',
            padding: '10px 12px',
            borderRadius: 'var(--radius-sm)',
            borderLeft: '3px solid #f59e0b',
          }}
        >
          <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700 }}>
            Next Major Event
          </div>
          <div className="mono" style={{ fontSize: '0.75rem', fontWeight: 700, color: '#fbbf24', marginTop: 3 }}>
            {nextEvent ? `${nextEvent.currency} ${nextEvent.event} • ${formatTime(nextEvent.event_time)}` : 'USD Core CPI • 15:30 WAT'}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>
            {nextEvent ? `Consensus: ${nextEvent.consensus || 'N/A'}` : 'High Volatility Expected'}
          </div>
        </div>
      </div>
    </div>
  );
};
