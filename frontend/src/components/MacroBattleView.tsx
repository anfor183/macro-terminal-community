import React, { useState, useEffect } from 'react';
import {
  Swords,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  ShieldCheck,
  Scale,
  Zap,
  ChevronDown,
  Coins,
} from 'lucide-react';
import { api } from '../services/api';
import { CurrencyMatrixItem } from '../types/macro';

interface MacroBattleViewProps {
  initialBase?: string;
  initialQuote?: string;
  onSelectPairAsset?: (symbol: string) => void;
}

interface AssetClashItem {
  code: string;
  name: string;
  flag: string;
  defaultScore: number;
  yield: number;
  policy: string;
  growth: string;
  group: 'Currencies' | 'Precious Metals';
}

export const MacroBattleView: React.FC<MacroBattleViewProps> = ({
  initialBase = 'EUR',
  initialQuote = 'USD',
  onSelectPairAsset,
}) => {
  const [matrix, setMatrix] = useState<CurrencyMatrixItem[]>([]);
  const [baseCode, setBaseCode] = useState<string>(initialBase);
  const [quoteCode, setQuoteCode] = useState<string>(initialQuote);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    api.getCurrencyMatrix()
      .then((data) => {
        setMatrix(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed fetching matrix for battle:', err);
        setLoading(false);
      });
  }, []);

  const clashAssets: AssetClashItem[] = [
    // G10 & Global Currencies
    { code: 'USD', name: 'US Dollar', flag: '????', defaultScore: -16.8, yield: 4.25, policy: 'Active Easing (Dovish)', growth: 'Resilient', group: 'Currencies' },
    { code: 'EUR', name: 'Euro', flag: '????', defaultScore: -2.0, yield: 2.38, policy: 'Gradual Easing', growth: 'Stabilizing', group: 'Currencies' },
    { code: 'GBP', name: 'British Pound', flag: '????', defaultScore: 6.1, yield: 4.12, policy: 'Cautious Cuts', growth: 'Sluggish', group: 'Currencies' },
    { code: 'JPY', name: 'Japanese Yen', flag: '????', defaultScore: 5.2, yield: 1.05, policy: 'Normalization (Hawkish)', growth: 'Weak Domestic', group: 'Currencies' },
    { code: 'CAD', name: 'Canadian Dollar', flag: '????', defaultScore: -21.1, yield: 3.25, policy: 'Active Easing', growth: 'Moderate', group: 'Currencies' },
    { code: 'AUD', name: 'Australian Dollar', flag: '????', defaultScore: 3.8, yield: 4.10, policy: 'Restrictive Hold', growth: 'China Drag', group: 'Currencies' },
    { code: 'NZD', name: 'New Zealand Dollar', flag: '????', defaultScore: -17.6, yield: 4.50, policy: 'Accelerated Cuts', growth: 'Recessionary', group: 'Currencies' },
    { code: 'CHF', name: 'Swiss Franc', flag: '????', defaultScore: -8.8, yield: 1.00, policy: 'Accommodative', growth: 'Subdued', group: 'Currencies' },
    { code: 'SEK', name: 'Swedish Krona', flag: '????', defaultScore: 12.0, yield: 2.75, policy: 'Paused / Neutral', growth: 'Stable', group: 'Currencies' },
    { code: 'NOK', name: 'Norwegian Krone', flag: '????', defaultScore: 5.0, yield: 4.50, policy: 'Restrictive Hold', growth: 'Stable', group: 'Currencies' },
    { code: 'CNY', name: 'Chinese Yuan', flag: '????', defaultScore: -17.6, yield: 2.10, policy: 'Active Easing', growth: 'Slowing', group: 'Currencies' },
    // Precious Metals & Commodities
    { code: 'XAU', name: 'Gold (Spot Bullion)', flag: '??', defaultScore: 16.5, yield: 0.00, policy: 'Reserve Asset / Real Rate Hedge', growth: 'Safe Haven Inflows', group: 'Precious Metals' },
    { code: 'XAG', name: 'Silver (Spot Bullion)', flag: '??', defaultScore: 15.0, yield: 0.00, policy: 'Dual Monetary & Industrial Asset', growth: 'Solar / Electrification Demand', group: 'Precious Metals' },
    { code: 'XPT', name: 'Platinum (Spot Bullion)', flag: '??', defaultScore: 15.0, yield: 0.00, policy: 'Structural Supply Deficit', growth: 'Catalytic & Hydrogen Demand', group: 'Precious Metals' },
    { code: 'COPPER', name: 'Copper (High Grade)', flag: '??', defaultScore: 15.0, yield: 0.00, policy: 'Electrification Mandate', growth: 'Infrastructure PMI Surge', group: 'Precious Metals' },
  ];

  const baseCurr = clashAssets.find((c) => c.code === baseCode) || clashAssets[1];
  const quoteCurr = clashAssets.find((c) => c.code === quoteCode) || clashAssets[0];

  // Dynamic scores from matrix
  const baseMatrix = matrix.find((m) => m.currency === baseCode);
  const quoteMatrix = matrix.find((m) => m.currency === quoteCode);

  const baseScore = baseMatrix ? baseMatrix.absolute_score : baseCurr.defaultScore;
  const quoteScore = quoteMatrix ? quoteMatrix.absolute_score : quoteCurr.defaultScore;

  // Net relative differential
  const netScore = Math.round(baseScore - quoteScore);
  const yieldDiff = (baseCurr.yield - quoteCurr.yield).toFixed(2);

  // Map to asset inspection symbol
  let pairSymbol = `${baseCode}${quoteCode}`;
  if (baseCode === 'COPPER' && quoteCode === 'USD') pairSymbol = 'HG';
  if (baseCode === 'USD' && quoteCode === 'COPPER') pairSymbol = 'HG';

  const isBaseAdvantaged = netScore > 10;
  const isQuoteAdvantaged = netScore < -10;

  const formatPolicy = (stance?: string, fallback: string = 'Neutral') => {
    if (!stance) return fallback;
    const s = stance.toLowerCase();
    if (s.includes('easing')) return 'Active Easing (Dovish)';
    if (s.includes('tightening')) return 'Tightening (Hawkish)';
    if (s.includes('paused') || s.includes('hold')) return 'Paused / Neutral';
    return stance;
  };

  const basePolicy = formatPolicy(baseMatrix?.policy_stance, baseCurr.policy);
  const baseGrowth = baseMatrix?.growth_stance || baseCurr.growth;
  const quotePolicy = formatPolicy(quoteMatrix?.policy_stance, quoteCurr.policy);
  const quoteGrowth = quoteMatrix?.growth_stance || quoteCurr.growth;

  const isBaseMetal = baseCurr.group === 'Precious Metals';
  const isQuoteMetal = quoteCurr.group === 'Precious Metals';
  const isCrossMetal = isBaseMetal && isQuoteMetal;
  const isMetalClash = isBaseMetal || isQuoteMetal;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* View Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12,
          background: 'var(--surface-1)',
          padding: '16px 20px',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-subtle)',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Swords size={20} color="var(--accent-cyan)" />
            <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
              MACRO BATTLE: Relative Fundamental Clash
            </h2>
            <span
              style={{
                fontSize: '0.68rem',
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: 4,
                background: 'rgba(56, 189, 248, 0.12)',
                color: 'var(--accent-cyan)',
                border: '1px solid rgba(56, 189, 248, 0.25)',
                textTransform: 'uppercase',
              }}
            >
              Currencies & Metals
            </span>
          </div>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 4, marginBottom: 0 }}>
            Head-to-head quantitative cross analysis comparing central bank stance, real sovereign yields, bullion reserve flows, and growth regimes.
          </p>
        </div>

        {/* Base & Quote Asset Selectors */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontWeight: 600 }}>BASE:</label>
            <select
              value={baseCode}
              onChange={(e) => setBaseCode(e.target.value)}
              style={{
                background: 'var(--surface-2)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-primary)',
                padding: '6px 10px',
                borderRadius: 'var(--radius-sm)',
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: '0.8rem',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              <optgroup label="Global Currencies">
                {clashAssets.filter((c) => c.group === 'Currencies').map((c) => (
                  <option key={`base-${c.code}`} value={c.code}>
                    {c.flag} {c.code} ? {c.name}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Precious Metals & Commodities">
                {clashAssets.filter((c) => c.group === 'Precious Metals').map((c) => (
                  <option key={`base-${c.code}`} value={c.code}>
                    {c.flag} {c.code} ? {c.name}
                  </option>
                ))}
              </optgroup>
            </select>
          </div>

          <span style={{ color: 'var(--accent-cyan)', fontWeight: 800, fontSize: '0.8rem' }}>VS</span>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontWeight: 600 }}>QUOTE:</label>
            <select
              value={quoteCode}
              onChange={(e) => setQuoteCode(e.target.value)}
              style={{
                background: 'var(--surface-2)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-primary)',
                padding: '6px 10px',
                borderRadius: 'var(--radius-sm)',
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: '0.8rem',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              <optgroup label="Global Currencies">
                {clashAssets.filter((c) => c.group === 'Currencies').map((c) => (
                  <option key={`quote-${c.code}`} value={c.code} disabled={c.code === baseCode}>
                    {c.flag} {c.code} ? {c.name}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Precious Metals & Commodities">
                {clashAssets.filter((c) => c.group === 'Precious Metals').map((c) => (
                  <option key={`quote-${c.code}`} value={c.code} disabled={c.code === baseCode}>
                    {c.flag} {c.code} ? {c.name}
                  </option>
                ))}
              </optgroup>
            </select>
          </div>
        </div>
      </div>

      {/* The Head-to-Head Arena */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr auto 1fr',
          gap: 16,
          alignItems: 'stretch',
        }}
      >
        {/* Base Asset Card */}
        <div
          style={{
            background: 'var(--surface-1)',
            border: `1px solid ${isBaseAdvantaged ? 'rgba(16, 185, 129, 0.4)' : 'var(--border-subtle)'}`,
            borderRadius: 'var(--radius-lg)',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {isBaseAdvantaged && (
            <div
              style={{
                position: 'absolute',
                top: 10,
                right: 14,
                fontSize: '0.75rem',
                fontWeight: 800,
                padding: '2px 8px',
                borderRadius: 4,
                background: 'rgba(16, 185, 129, 0.2)',
                color: '#34d399',
                border: '1px solid rgba(16, 185, 129, 0.3)',
              }}
            >
              FUNDAMENTAL LEADER
            </div>
          )}

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: '2rem' }}>{baseCurr.flag}</span>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <h3 className="mono" style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                    {baseCurr.code}
                  </h3>
                  {isBaseMetal && (
                    <span
                      style={{
                        fontSize: '0.65rem',
                        fontWeight: 700,
                        padding: '2px 6px',
                        borderRadius: 4,
                        background: 'rgba(234, 179, 8, 0.15)',
                        color: '#eab308',
                        border: '1px solid rgba(234, 179, 8, 0.3)',
                      }}
                    >
                      BULLION / METAL
                    </span>
                  )}
                </div>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{baseCurr.name}</span>
              </div>
            </div>

            <div style={{ marginTop: 20 }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Macro Composite Score
              </div>
              <div
                className="mono"
                style={{
                  fontSize: '2.4rem',
                  fontWeight: 800,
                  color: baseScore >= 0 ? '#10b981' : '#ef4444',
                  marginTop: 2,
                }}
              >
                {baseScore > 0 ? `+${baseScore}` : baseScore}
              </div>
            </div>
          </div>

          <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: 6 }}>
              <span style={{ color: 'var(--text-dim)' }}>Policy / Monetary Role:</span>
              <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{basePolicy}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: 6 }}>
              <span style={{ color: 'var(--text-dim)' }}>{isBaseMetal ? 'Nominal Yield (Bullion):' : '10Y Sovereign Yield:'}</span>
              <span className="mono" style={{ fontWeight: 600, color: '#38bdf8' }}>
                {isBaseMetal ? '0.00% (Zero-Coupon)' : `${baseCurr.yield.toFixed(2)}%`}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
              <span style={{ color: 'var(--text-dim)' }}>Growth Regime / Driver:</span>
              <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{baseGrowth}</span>
            </div>
          </div>
        </div>

        {/* Center Net Reconciliation Pillar */}
        <div
          style={{
            background: 'var(--surface-elevated)',
            border: '1px solid var(--border-active)',
            borderRadius: 'var(--radius-lg)',
            padding: '24px 20px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minWidth: 200,
            boxShadow: 'var(--shadow-md)',
            position: 'relative',
          }}
        >
          <div
            style={{
              width: 42,
              height: 42,
              borderRadius: '50%',
              background: 'var(--surface-2)',
              border: '1px solid var(--border-subtle)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 12,
            }}
          >
            <Scale size={20} color="var(--accent-cyan)" />
          </div>

          <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>
            NET FUNDAMENTAL DELTA
          </span>

          <span
            className="mono"
            style={{
              fontSize: '2rem',
              fontWeight: 900,
              color: netScore > 0 ? '#10b981' : netScore < 0 ? '#ef4444' : '#94a3b8',
              marginTop: 4,
            }}
          >
            {netScore > 0 ? `+${netScore}` : netScore}
          </span>

          <span
            style={{
              fontSize: '0.75rem',
              fontWeight: 800,
              padding: '2px 8px',
              borderRadius: 4,
              marginTop: 4,
              background: netScore > 10 ? 'var(--color-bullish-bg)' : netScore < -10 ? 'var(--color-bearish-bg)' : 'var(--color-neutral-bg)',
              color: netScore > 10 ? 'var(--color-bullish)' : netScore < -10 ? 'var(--color-bearish)' : 'var(--text-secondary)',
            }}
          >
            {netScore > 25 ? 'STRONG BULLISH' : netScore > 10 ? 'BULLISH' : netScore < -25 ? 'STRONG BEARISH' : netScore < -10 ? 'BEARISH' : 'NEUTRAL'}
          </span>

          <div
            style={{
              marginTop: 16,
              fontSize: '0.75rem',
              color: 'var(--text-dim)',
              textAlign: 'center',
              lineHeight: 1.4,
            }}
          >
            Yield Diff: <strong className="mono" style={{ color: Number(yieldDiff) >= 0 ? 'var(--color-bullish)' : 'var(--color-bearish)' }}>{Number(yieldDiff) >= 0 ? `+${yieldDiff}%` : `${yieldDiff}%`}</strong>
          </div>

          {onSelectPairAsset && (
            <button
              onClick={() => onSelectPairAsset(pairSymbol)}
              style={{
                marginTop: 18,
                padding: '6px 12px',
                fontSize: '0.75rem',
                fontWeight: 700,
                color: '#fff',
                background: 'var(--accent-blue)',
                border: 'none',
                borderRadius: 'var(--radius-sm)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                transition: 'all 0.15s ease',
              }}
            >
              Inspect {pairSymbol} <ArrowRight size={13} />
            </button>
          )}
        </div>

        {/* Quote Asset Card */}
        <div
          style={{
            background: 'var(--surface-1)',
            border: `1px solid ${isQuoteAdvantaged ? 'rgba(16, 185, 129, 0.4)' : 'var(--border-subtle)'}`,
            borderRadius: 'var(--radius-lg)',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {isQuoteAdvantaged && (
            <div
              style={{
                position: 'absolute',
                top: 10,
                right: 14,
                fontSize: '0.75rem',
                fontWeight: 800,
                padding: '2px 8px',
                borderRadius: 4,
                background: 'rgba(16, 185, 129, 0.2)',
                color: '#34d399',
                border: '1px solid rgba(16, 185, 129, 0.3)',
              }}
            >
              FUNDAMENTAL LEADER
            </div>
          )}

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: '2rem' }}>{quoteCurr.flag}</span>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <h3 className="mono" style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                    {quoteCurr.code}
                  </h3>
                  {isQuoteMetal && (
                    <span
                      style={{
                        fontSize: '0.65rem',
                        fontWeight: 700,
                        padding: '2px 6px',
                        borderRadius: 4,
                        background: 'rgba(234, 179, 8, 0.15)',
                        color: '#eab308',
                        border: '1px solid rgba(234, 179, 8, 0.3)',
                      }}
                    >
                      BULLION / METAL
                    </span>
                  )}
                </div>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{quoteCurr.name}</span>
              </div>
            </div>

            <div style={{ marginTop: 20 }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Macro Composite Score
              </div>
              <div
                className="mono"
                style={{
                  fontSize: '2.4rem',
                  fontWeight: 800,
                  color: quoteScore >= 0 ? '#10b981' : '#ef4444',
                  marginTop: 2,
                }}
              >
                {quoteScore > 0 ? `+${quoteScore}` : quoteScore}
              </div>
            </div>
          </div>

          <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: 6 }}>
              <span style={{ color: 'var(--text-dim)' }}>Policy / Monetary Role:</span>
              <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{quotePolicy}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: 6 }}>
              <span style={{ color: 'var(--text-dim)' }}>{isQuoteMetal ? 'Nominal Yield (Bullion):' : '10Y Sovereign Yield:'}</span>
              <span className="mono" style={{ fontWeight: 600, color: '#38bdf8' }}>
                {isQuoteMetal ? '0.00% (Zero-Coupon)' : `${quoteCurr.yield.toFixed(2)}%`}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
              <span style={{ color: 'var(--text-dim)' }}>Growth Regime / Driver:</span>
              <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{quoteGrowth}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Factor Difference Explanatory Decomposition */}
      <div
        style={{
          background: 'var(--surface-1)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-md)',
          padding: '20px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <Zap size={16} color="var(--accent-cyan)" />
          <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.04em', margin: 0 }}>
            What Is Causing The {pairSymbol} Fundamental Divergence?
          </h4>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
          {/* Card 1: Monetary Transmission or Opportunity Cost */}
          <div style={{ background: 'var(--surface-2)', padding: '12px 14px', borderRadius: 'var(--radius-sm)', borderLeft: '3px solid #06b6d4' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              {isMetalClash ? '1. Real Interest Rates & Opportunity Cost' : '1. Central Bank & Monetary Stance'}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: 4, lineHeight: 1.4 }}>
              {isCrossMetal
                ? `${baseCode} vs ${quoteCode} ratio is driven by industrial fabrication velocity vs pure bullion safe-haven holding demand.`
                : isMetalClash
                ? `${isBaseMetal ? baseCode : quoteCode} carries zero nominal yield; sovereign policy stance (${isBaseMetal ? quotePolicy.toLowerCase() : basePolicy.toLowerCase()}) and real 10Y sovereign yields govern the opportunity cost of holding physical metal.`
                : `${baseCode} policy stance is ${basePolicy.toLowerCase()} while ${quoteCode} is priced for ${quotePolicy.toLowerCase()}.`}
            </div>
          </div>

          {/* Card 2: Sovereign Yield Differential or Carry Drag */}
          <div style={{ background: 'var(--surface-2)', padding: '12px 14px', borderRadius: 'var(--radius-sm)', borderLeft: '3px solid #10b981' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              {isMetalClash ? '2. Sovereign Carry & Yield Spread' : '2. Sovereign Yield Differential'}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: 4, lineHeight: 1.4 }}>
              {isCrossMetal
                ? `Zero coupon differential across physical metals isolates performance to gold/silver beta and industrial supply crunches.`
                : isMetalClash
                ? `Yield spread of ${yieldDiff}% represents the carry penalty / financing friction of holding bullion against ${isBaseMetal ? quoteCode : baseCode} sovereign fixed-income paper.`
                : `Yield spread of ${yieldDiff}% creates persistent carry & institutional capital flows toward the higher-yielding sovereign paper.`}
            </div>
          </div>

          {/* Card 3: Economic Resilience or Reserve Inflows */}
          <div style={{ background: 'var(--surface-2)', padding: '12px 14px', borderRadius: 'var(--radius-sm)', borderLeft: '3px solid #f59e0b' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              {isMetalClash ? '3. Central Bank Reserves & Geopolitical Hedging' : '3. Economic & Growth Resilience'}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: 4, lineHeight: 1.4 }}>
              {isMetalClash
                ? `Institutional reserve diversification away from fiat paper, structural de-dollarization flows, and geopolitical risk premia favor ${isBaseAdvantaged ? baseCode : isQuoteAdvantaged ? quoteCode : 'bullion assets'}.`
                : `Composite PMIs and macro surprise indices favor ${isBaseAdvantaged ? baseCode : isQuoteAdvantaged ? quoteCode : 'neither currency exclusively'}.`}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
