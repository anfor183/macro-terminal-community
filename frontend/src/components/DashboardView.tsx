import React, { useState } from 'react';
import {
  Globe,
  TrendingUp,
  TrendingDown,
  Activity,
  Calendar,
  History,
  ShieldCheck,
  ChevronRight,
  Flame,
  ArrowUpRight,
  ArrowDownRight,
  Sliders,
  Sparkles,
} from 'lucide-react';
import { AssetItem, MacroRegime, WhatChangedItem, CalendarEvent } from '../types/macro';
import { AssetTable, getBiasBadgeClass } from './AssetTable';
import { MarketAtAGlance } from './MarketAtAGlance';
import { MacroConvictionCard } from './MacroConvictionCard';
import { CatalystStream } from './CatalystStream';

interface DashboardViewProps {
  regime: MacroRegime | null;
  assets: AssetItem[];
  whatChanged: WhatChangedItem[];
  calendar: CalendarEvent[];
  currencies?: Array<{ rank: number; code: string; name: string; score: number; weekly_score: number; policy_direction: string; growth_direction: string }>;
  onSelectAsset: (symbol: string) => void;
  onNavigateTab: (tab: any) => void;
  onOpenEvidence?: () => void;
  onRefresh?: () => Promise<void> | void;
  density?: 'compact' | 'standard' | 'comfortable';
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  regime,
  assets,
  whatChanged,
  calendar,
  currencies,
  onSelectAsset,
  onNavigateTab,
  onOpenEvidence,
  onRefresh,
  density = 'standard',
}) => {
  const [selectedClass, setSelectedClass] = useState<string>('all');

  const filteredAssets =
    selectedClass === 'all' ? assets : assets.filter((a) => a.asset_class === selectedClass);

  // Top conviction signals (|score| * confidence)
  const topSignals = [...assets]
    .sort((a, b) => Math.abs(b.score) * b.confidence - Math.abs(a.score) * a.confidence)
    .slice(0, 4);

  // Currency Horizontal Strength Ranking Data (Section 10) - from live model
  const currencyStrengthData = (currencies && currencies.length > 0)
    ? currencies.slice(0, 8).map((c) => ({
        code: c.code,
        score: c.score,
        weeklyChange: Math.round((c.score - c.weekly_score) * 10) / 10,
        trend: c.score >= c.weekly_score ? ('up' as const) : ('down' as const),
      }))
    : [
        { code: 'JPY', score: 55, weeklyChange: 2.0, trend: 'up' as const },
        { code: 'EUR', score: 42, weeklyChange: 2.0, trend: 'up' as const },
        { code: 'AUD', score: 28, weeklyChange: 2.0, trend: 'up' as const },
        { code: 'GBP', score: 25, weeklyChange: 2.0, trend: 'up' as const },
        { code: 'USD', score: 18, weeklyChange: 2.0, trend: 'up' as const },
        { code: 'CHF', score: 10, weeklyChange: 2.0, trend: 'up' as const },
        { code: 'CAD', score: -15, weeklyChange: -2.0, trend: 'down' as const },
        { code: 'NZD', score: -20, weeklyChange: -2.0, trend: 'down' as const },
      ];

  // Primary Spotlight Asset for Signature Conviction Component
  const featuredAsset = assets.find((a) => a.symbol === 'EURUSD') || assets[0];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: density === 'compact' ? 10 : density === 'comfortable' ? 24 : 16 }}>
      {/* 1. Market At A Glance (10-Second Executive Summary) */}
      <MarketAtAGlance
        regime={regime}
        assets={assets}
        calendar={calendar}
        currencies={currencies}
        onSelectAsset={onSelectAsset}
        onNavigateTab={onNavigateTab}
      />

      {/* 2. Global Macro Regime Hero Section (Section 8 & 9) */}
      {regime && (
        <div
          style={{
            background: 'linear-gradient(135deg, var(--surface-1) 0%, var(--surface-2) 100%)',
            border: '1px solid var(--border-subtle)',
            borderLeft: '4px solid var(--accent-cyan)',
            borderRadius: 'var(--radius-lg)',
            padding: '20px 24px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 24,
            boxShadow: 'var(--shadow-sm)',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Globe size={18} color="var(--accent-cyan)" />
              <span
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 800,
                  color: 'var(--text-muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                }}
              >
                GLOBAL MACRO REGIME
              </span>
              <span
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 800,
                  padding: '2px 8px',
                  borderRadius: 4,
                  background:
                    regime.risk_sentiment === 'RISK_ON'
                      ? 'var(--color-bullish-bg)'
                      : 'var(--accent-gold-bg)',
                  color: regime.risk_sentiment === 'RISK_ON' ? 'var(--color-bullish)' : 'var(--accent-gold)',
                }}
              >
                {regime.risk_sentiment}
              </span>
              <span
                className="mono"
                style={{
                  fontSize: '0.75rem',
                  color: 'var(--accent-cyan)',
                  background: 'rgba(6, 182, 212, 0.1)',
                  padding: '2px 6px',
                  borderRadius: 4,
                  fontWeight: 700,
                }}
              >
                Regime Confidence: 82%
              </span>
            </div>

            <h2
              style={{
                fontSize: '1.35rem',
                fontWeight: 900,
                color: 'var(--text-primary)',
                marginTop: 6,
                letterSpacing: '-0.01em',
              }}
            >
              {regime.primary_regime}
            </h2>
            <p
              style={{
                fontSize: '0.8rem',
                color: 'var(--text-secondary)',
                marginTop: 4,
                maxWidth: 880,
                lineHeight: 1.45,
              }}
            >
              {regime.summary}
            </p>
          </div>

          {/* Key Regime Metrics */}
          <div
            style={{
              display: 'flex',
              gap: 20,
              borderLeft: '1px solid var(--border-subtle)',
              paddingLeft: 24,
              flexShrink: 0,
            }}
          >
            <div>
              <div
                style={{
                  fontSize: '0.75rem',
                  color: 'var(--text-dim)',
                  textTransform: 'uppercase',
                  fontWeight: 700,
                }}
              >
                Inflation Regime
              </div>
              <div
                className="mono"
                style={{ fontSize: '0.9rem', fontWeight: 800, color: '#38bdf8', marginTop: 2 }}
              >
                {regime.inflation_cycle}
              </div>
            </div>
            <div>
              <div
                style={{
                  fontSize: '0.75rem',
                  color: 'var(--text-dim)',
                  textTransform: 'uppercase',
                  fontWeight: 700,
                }}
              >
                Growth Regime
              </div>
              <div
                className="mono"
                style={{ fontSize: '0.9rem', fontWeight: 800, color: '#10b981', marginTop: 2 }}
              >
                {regime.growth_cycle}
              </div>
            </div>
            <div>
              <div
                style={{
                  fontSize: '0.75rem',
                  color: 'var(--text-dim)',
                  textTransform: 'uppercase',
                  fontWeight: 700,
                }}
              >
                Liquidity
              </div>
              <div
                className="mono"
                style={{ fontSize: '0.9rem', fontWeight: 800, color: '#f59e0b', marginTop: 2 }}
              >
                {regime.liquidity_cycle}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. Signature Feature Split: Macro Conviction Card & Live Catalyst Stream */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(420px, 1.3fr) minmax(360px, 1fr)',
          gap: 20,
          alignItems: 'stretch',
        }}
      >
        {/* Signature #1: Macro Conviction Card */}
        {featuredAsset && (
          <MacroConvictionCard
            symbol={featuredAsset.symbol}
            name={featuredAsset.name}
            bias={featuredAsset.tactical_bias}
            score={featuredAsset.score}
            confidence={featuredAsset.confidence}
            onOpenEvidence={onOpenEvidence}
          />
        )}

        {/* Signature #3: Real-Time Catalyst Stream */}
        <CatalystStream
          compact={density === 'compact'}
          whatChanged={whatChanged}
          onSelectAsset={onSelectAsset}
          onOpenEvidence={() => onOpenEvidence && onOpenEvidence()}
          onRefresh={onRefresh}
        />
      </div>

      {/* 4. Horizontal Currency Strength Ranking (Section 10) */}
      <div
        style={{
          background: 'var(--surface-1)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-lg)',
          padding: '20px',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 16,
          }}
        >
          <div>
            <div
              style={{
                fontSize: '0.75rem',
                fontWeight: 800,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                color: 'var(--text-muted)',
              }}
            >
              G10 Currency Fundamental Strength Rankings
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: 2 }}>
              Normalized composite fundamental scores with weekly trajectory delta
            </div>
          </div>

          <button
            onClick={() => onNavigateTab('matrix')}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--accent-cyan)',
              fontSize: '0.75rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            Open Currency Matrix <ChevronRight size={14} />
          </button>
        </div>

        {/* Horizontal Bars Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: 12,
          }}
        >
          {currencyStrengthData.map((curr) => {
            const isBull = curr.score >= 0;
            const barWidth = `${Math.min(100, Math.max(10, Math.abs(curr.score)))}%`;

            return (
              <div
                key={curr.code}
                style={{
                  background: 'var(--surface-2)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '10px 14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span
                    className="mono"
                    style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)' }}
                  >
                    {curr.code}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span
                      className="mono"
                      style={{
                        fontSize: '0.9rem',
                        fontWeight: 800,
                        color: isBull ? 'var(--color-bullish)' : 'var(--color-bearish)',
                      }}
                    >
                      {curr.score > 0 ? `+${curr.score}` : curr.score}
                    </span>
                    <span
                      style={{
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        color: curr.weeklyChange >= 0 ? 'var(--color-bullish)' : 'var(--color-bearish)',
                      }}
                    >
                      {curr.weeklyChange >= 0 ? `↑ +${curr.weeklyChange}` : `↓ ${curr.weeklyChange}`}
                    </span>
                  </div>
                </div>

                {/* Horizontal Progress Bar */}
                <div
                  style={{
                    height: 5,
                    background: 'var(--surface-3)',
                    borderRadius: 3,
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      width: barWidth,
                      height: '100%',
                      background: isBull
                        ? 'linear-gradient(90deg, #06b6d4, #10b981)'
                        : 'linear-gradient(90deg, #ef4444, #b91c1c)',
                      borderRadius: 3,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 5. Complete Trading Asset Overview with Asset Class Tabs */}
      <div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          {[
            { id: 'all', label: 'All Global Assets' },
            { id: 'forex', label: 'Forex Majors & Crosses' },
            { id: 'index', label: 'Equity Indices' },
            { id: 'metal', label: 'Precious Metals' },
            { id: 'commodity', label: 'Energy & Commodities' },
            { id: 'crypto', label: 'Crypto (BTC & ETH)' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedClass(tab.id)}
              style={{
                padding: '6px 14px',
                borderRadius: 'var(--radius-sm)',
                border:
                  selectedClass === tab.id
                    ? '1px solid var(--border-active)'
                    : '1px solid var(--border-subtle)',
                background: selectedClass === tab.id ? 'var(--surface-3)' : 'var(--surface-1)',
                color: selectedClass === tab.id ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                fontSize: '0.78rem',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <AssetTable
          assets={filteredAssets}
          onSelectAsset={onSelectAsset}
          title="Macro Fundamental Scoring & Tactical Bias Universe"
        />
      </div>
    </div>
  );
};
