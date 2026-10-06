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

export const AssetEmblem: React.FC<{ code: string; size?: number; style?: React.CSSProperties }> = ({
  code,
  size = 36,
  style = {},
}) => {
  const s = size;

  switch (code.toUpperCase()) {
    case 'USD':
      return (
        <svg width={s} height={s} viewBox="0 0 36 36" style={{ borderRadius: '50%', flexShrink: 0, boxShadow: '0 2px 6px rgba(0,0,0,0.2)', ...style }}>
          <circle cx="18" cy="18" r="18" fill="#1e3a8a" />
          <path d="M0 16 H36 V19 H0 Z M0 22 H36 V25 H0 Z M0 28 H36 V31 H0 Z M0 34 H36 V36 H0 Z" fill="#dc2626" />
          <path d="M0 19 H36 V22 H0 Z M0 25 H36 V28 H0 Z M0 31 H36 V34 H0 Z" fill="#ffffff" />
          <rect x="0" y="0" width="18" height="18" fill="#1e3a8a" />
          <circle cx="5" cy="5" r="1.3" fill="#ffffff" />
          <circle cx="13" cy="5" r="1.3" fill="#ffffff" />
          <circle cx="9" cy="9" r="1.3" fill="#ffffff" />
          <circle cx="5" cy="13" r="1.3" fill="#ffffff" />
          <circle cx="13" cy="13" r="1.3" fill="#ffffff" />
          <circle cx="18" cy="18" r="17.2" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" />
        </svg>
      );
    case 'EUR':
      return (
        <svg width={s} height={s} viewBox="0 0 36 36" style={{ borderRadius: '50%', flexShrink: 0, boxShadow: '0 2px 6px rgba(0,0,0,0.2)', ...style }}>
          <circle cx="18" cy="18" r="18" fill="#003399" />
          {[...Array(12)].map((_, i) => {
            const angle = (i * 30 * Math.PI) / 180;
            const cx = 18 + 10.5 * Math.sin(angle);
            const cy = 18 - 10.5 * Math.cos(angle);
            return (
              <polygon
                key={i}
                points={`${cx},${cy - 2.2} ${cx + 0.7},${cy - 0.7} ${cx + 2.2},${cy - 0.7} ${cx + 1},${cy + 0.4} ${cx + 1.5},${cy + 1.9} ${cx},${cy + 0.9} ${cx - 1.5},${cy + 1.9} ${cx - 1},${cy + 0.4} ${cx - 2.2},${cy - 0.7} ${cx - 0.7},${cy - 0.7}`}
                fill="#ffcc00"
              />
            );
          })}
          <circle cx="18" cy="18" r="17.2" fill="none" stroke="rgba(255,204,0,0.4)" strokeWidth="1.5" />
        </svg>
      );
    case 'GBP':
      return (
        <svg width={s} height={s} viewBox="0 0 36 36" style={{ borderRadius: '50%', flexShrink: 0, boxShadow: '0 2px 6px rgba(0,0,0,0.2)', ...style }}>
          <circle cx="18" cy="18" r="18" fill="#012169" />
          <path d="M0 0 L36 36 M36 0 L0 36" stroke="#ffffff" strokeWidth="5.5" />
          <path d="M0 0 L36 36 M36 0 L0 36" stroke="#c8102e" strokeWidth="2.8" />
          <path d="M18 0 V36 M0 18 H36" stroke="#ffffff" strokeWidth="8" />
          <path d="M18 0 V36 M0 18 H36" stroke="#c8102e" strokeWidth="4.8" />
          <circle cx="18" cy="18" r="17.2" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" />
        </svg>
      );
    case 'JPY':
      return (
        <svg width={s} height={s} viewBox="0 0 36 36" style={{ borderRadius: '50%', flexShrink: 0, boxShadow: '0 2px 6px rgba(0,0,0,0.15)', ...style }}>
          <circle cx="18" cy="18" r="18" fill="#ffffff" />
          <circle cx="18" cy="18" r="8.5" fill="#bc002d" />
          <circle cx="18" cy="18" r="17.2" fill="none" stroke="rgba(0,0,0,0.15)" strokeWidth="1.5" />
        </svg>
      );
    case 'CAD':
      return (
        <svg width={s} height={s} viewBox="0 0 36 36" style={{ borderRadius: '50%', flexShrink: 0, boxShadow: '0 2px 6px rgba(0,0,0,0.2)', ...style }}>
          <circle cx="18" cy="18" r="18" fill="#ffffff" />
          <path d="M0 0 H9 V36 H0 Z M27 0 H36 V36 H27 Z" fill="#d80621" />
          <polygon points="18,8 19.5,13.5 24,11 22,16 26,17.5 23,20.5 24,24 19.5,22.5 19,27 17,27 16.5,22.5 12,24 13,20.5 10,17.5 14,16 12,11 16.5,13.5" fill="#d80621" />
          <circle cx="18" cy="18" r="17.2" fill="none" stroke="rgba(0,0,0,0.15)" strokeWidth="1.5" />
        </svg>
      );
    case 'AUD':
      return (
        <svg width={s} height={s} viewBox="0 0 36 36" style={{ borderRadius: '50%', flexShrink: 0, boxShadow: '0 2px 6px rgba(0,0,0,0.2)', ...style }}>
          <circle cx="18" cy="18" r="18" fill="#00008b" />
          <path d="M0 0 L18 18 M18 0 L0 18" stroke="#ffffff" strokeWidth="2.5" />
          <path d="M0 0 L18 18 M18 0 L0 18" stroke="#cc0000" strokeWidth="1.2" />
          <path d="M9 0 V18 M0 9 H18" stroke="#ffffff" strokeWidth="4" />
          <path d="M9 0 V18 M0 9 H18" stroke="#cc0000" strokeWidth="2" />
          <circle cx="26" cy="9" r="1.5" fill="#ffffff" />
          <circle cx="29" cy="17" r="1.5" fill="#ffffff" />
          <circle cx="24" cy="24" r="1.5" fill="#ffffff" />
          <circle cx="31" cy="23" r="1.5" fill="#ffffff" />
          <circle cx="27" cy="29" r="1.5" fill="#ffffff" />
          <circle cx="18" cy="18" r="17.2" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" />
        </svg>
      );
    case 'NZD':
      return (
        <svg width={s} height={s} viewBox="0 0 36 36" style={{ borderRadius: '50%', flexShrink: 0, boxShadow: '0 2px 6px rgba(0,0,0,0.2)', ...style }}>
          <circle cx="18" cy="18" r="18" fill="#00247d" />
          <path d="M0 0 L18 18 M18 0 L0 18" stroke="#ffffff" strokeWidth="2.5" />
          <path d="M0 0 L18 18 M18 0 L0 18" stroke="#cc0000" strokeWidth="1.2" />
          <path d="M9 0 V18 M0 9 H18" stroke="#ffffff" strokeWidth="4" />
          <path d="M9 0 V18 M0 9 H18" stroke="#cc0000" strokeWidth="2" />
          <circle cx="27" cy="10" r="1.8" fill="#cc0000" stroke="#ffffff" strokeWidth="0.8" />
          <circle cx="30" cy="18" r="1.8" fill="#cc0000" stroke="#ffffff" strokeWidth="0.8" />
          <circle cx="24" cy="25" r="1.8" fill="#cc0000" stroke="#ffffff" strokeWidth="0.8" />
          <circle cx="28" cy="29" r="1.8" fill="#cc0000" stroke="#ffffff" strokeWidth="0.8" />
          <circle cx="18" cy="18" r="17.2" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" />
        </svg>
      );
    case 'CHF':
      return (
        <svg width={s} height={s} viewBox="0 0 36 36" style={{ borderRadius: '50%', flexShrink: 0, boxShadow: '0 2px 6px rgba(0,0,0,0.2)', ...style }}>
          <circle cx="18" cy="18" r="18" fill="#d52b1e" />
          <rect x="14" y="8" width="8" height="20" rx="1.5" fill="#ffffff" />
          <rect x="8" y="14" width="20" height="8" rx="1.5" fill="#ffffff" />
          <circle cx="18" cy="18" r="17.2" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" />
        </svg>
      );
    case 'SEK':
      return (
        <svg width={s} height={s} viewBox="0 0 36 36" style={{ borderRadius: '50%', flexShrink: 0, boxShadow: '0 2px 6px rgba(0,0,0,0.2)', ...style }}>
          <circle cx="18" cy="18" r="18" fill="#006aa7" />
          <path d="M12 0 V36 M0 18 H36" stroke="#fecc00" strokeWidth="5.5" />
          <circle cx="18" cy="18" r="17.2" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" />
        </svg>
      );
    case 'NOK':
      return (
        <svg width={s} height={s} viewBox="0 0 36 36" style={{ borderRadius: '50%', flexShrink: 0, boxShadow: '0 2px 6px rgba(0,0,0,0.2)', ...style }}>
          <circle cx="18" cy="18" r="18" fill="#ba0c2f" />
          <path d="M12 0 V36 M0 18 H36" stroke="#ffffff" strokeWidth="6" />
          <path d="M12 0 V36 M0 18 H36" stroke="#00205b" strokeWidth="3" />
          <circle cx="18" cy="18" r="17.2" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" />
        </svg>
      );
    case 'CNY':
      return (
        <svg width={s} height={s} viewBox="0 0 36 36" style={{ borderRadius: '50%', flexShrink: 0, boxShadow: '0 2px 6px rgba(0,0,0,0.2)', ...style }}>
          <circle cx="18" cy="18" r="18" fill="#de2910" />
          <polygon points="11,6 12.5,10.5 17,10.5 13.5,13.5 15,18 11,15 7,18 8.5,13.5 5,10.5 9.5,10.5" fill="#ffde00" />
          <circle cx="18" cy="7" r="1.2" fill="#ffde00" />
          <circle cx="21" cy="10" r="1.2" fill="#ffde00" />
          <circle cx="21" cy="15" r="1.2" fill="#ffde00" />
          <circle cx="18" cy="18" r="1.2" fill="#ffde00" />
          <circle cx="18" cy="18" r="17.2" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" />
        </svg>
      );
    case 'XAU':
      return (
        <svg width={s} height={s} viewBox="0 0 36 36" style={{ borderRadius: '50%', flexShrink: 0, boxShadow: '0 2px 8px rgba(234,179,8,0.4)', ...style }}>
          <defs>
            <radialGradient id="battleGoldGrad" cx="35%" cy="35%" r="65%">
              <stop offset="0%" stopColor="#fef08a" />
              <stop offset="45%" stopColor="#eab308" />
              <stop offset="100%" stopColor="#a16207" />
            </radialGradient>
          </defs>
          <circle cx="18" cy="18" r="18" fill="url(#battleGoldGrad)" />
          <circle cx="18" cy="18" r="14" fill="none" stroke="#fef9c3" strokeWidth="1.2" strokeDasharray="2 2" />
          <text x="18" y="22" textAnchor="middle" fill="#713f12" fontSize="11" fontWeight="900" fontFamily="sans-serif">Au</text>
          <circle cx="18" cy="18" r="17.2" fill="none" stroke="#fef08a" strokeWidth="1.5" />
        </svg>
      );
    case 'XAG':
      return (
        <svg width={s} height={s} viewBox="0 0 36 36" style={{ borderRadius: '50%', flexShrink: 0, boxShadow: '0 2px 8px rgba(148,163,184,0.4)', ...style }}>
          <defs>
            <radialGradient id="battleSilverGrad" cx="35%" cy="35%" r="65%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="50%" stopColor="#cbd5e1" />
              <stop offset="100%" stopColor="#64748b" />
            </radialGradient>
          </defs>
          <circle cx="18" cy="18" r="18" fill="url(#battleSilverGrad)" />
          <circle cx="18" cy="18" r="14" fill="none" stroke="#f8fafc" strokeWidth="1.2" strokeDasharray="2 2" />
          <text x="18" y="22" textAnchor="middle" fill="#1e293b" fontSize="11" fontWeight="900" fontFamily="sans-serif">Ag</text>
          <circle cx="18" cy="18" r="17.2" fill="none" stroke="#ffffff" strokeWidth="1.5" />
        </svg>
      );
    case 'XPT':
      return (
        <svg width={s} height={s} viewBox="0 0 36 36" style={{ borderRadius: '50%', flexShrink: 0, boxShadow: '0 2px 8px rgba(56,189,248,0.4)', ...style }}>
          <defs>
            <radialGradient id="battlePlatGrad" cx="35%" cy="35%" r="65%">
              <stop offset="0%" stopColor="#f0f9ff" />
              <stop offset="45%" stopColor="#7dd3fc" />
              <stop offset="100%" stopColor="#0284c7" />
            </radialGradient>
          </defs>
          <circle cx="18" cy="18" r="18" fill="url(#battlePlatGrad)" />
          <circle cx="18" cy="18" r="14" fill="none" stroke="#e0f2fe" strokeWidth="1.2" strokeDasharray="2 2" />
          <text x="18" y="22" textAnchor="middle" fill="#082f49" fontSize="11" fontWeight="900" fontFamily="sans-serif">Pt</text>
          <circle cx="18" cy="18" r="17.2" fill="none" stroke="#bae6fd" strokeWidth="1.5" />
        </svg>
      );
    case 'COPPER':
      return (
        <svg width={s} height={s} viewBox="0 0 36 36" style={{ borderRadius: '50%', flexShrink: 0, boxShadow: '0 2px 8px rgba(249,115,22,0.4)', ...style }}>
          <defs>
            <radialGradient id="battleCopperGrad" cx="35%" cy="35%" r="65%">
              <stop offset="0%" stopColor="#ffedd5" />
              <stop offset="45%" stopColor="#fb923c" />
              <stop offset="100%" stopColor="#9a3412" />
            </radialGradient>
          </defs>
          <circle cx="18" cy="18" r="18" fill="url(#battleCopperGrad)" />
          <circle cx="18" cy="18" r="14" fill="none" stroke="#fed7aa" strokeWidth="1.2" strokeDasharray="2 2" />
          <text x="18" y="22" textAnchor="middle" fill="#431407" fontSize="11" fontWeight="900" fontFamily="sans-serif">Cu</text>
          <circle cx="18" cy="18" r="17.2" fill="none" stroke="#ffedd5" strokeWidth="1.5" />
        </svg>
      );
    default:
      return (
        <div
          style={{
            width: s,
            height: s,
            borderRadius: '50%',
            background: 'var(--surface-3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--text-primary)',
            fontSize: s * 0.35,
            fontWeight: 800,
            border: '1px solid var(--border-subtle)',
            flexShrink: 0,
            ...style,
          }}
        >
          {code.slice(0, 3)}
        </div>
      );
  }
};

interface MacroBattleViewProps {
  initialBase?: string;
  initialQuote?: string;
  onSelectPairAsset?: (symbol: string) => void;
  theme?: 'dark' | 'light';
}

interface AssetClashItem {
  code: string;
  name: string;
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
  theme: propTheme,
}) => {
  const [matrix, setMatrix] = useState<CurrencyMatrixItem[]>([]);
  const [baseCode, setBaseCode] = useState<string>(initialBase);
  const [quoteCode, setQuoteCode] = useState<string>(initialQuote);
  const [loading, setLoading] = useState<boolean>(true);

  // Live Reactive Theme Detection (Prop, DOM data-theme, and class)
  const [activeTheme, setActiveTheme] = useState<'dark' | 'light'>(() => {
    if (propTheme) return propTheme;
    if (typeof document !== 'undefined') {
      const docTheme = document.documentElement.getAttribute('data-theme');
      if (docTheme === 'light' || document.body.classList.contains('theme-light')) return 'light';
      if (docTheme === 'dark') return 'dark';
      const saved = localStorage.getItem('terminal-theme');
      if (saved === 'light') return 'light';
    }
    return 'dark';
  });

  useEffect(() => {
    if (propTheme) {
      setActiveTheme(propTheme);
      return;
    }
    const checkTheme = () => {
      const docTheme = document.documentElement.getAttribute('data-theme');
      const isL = docTheme === 'light' || (typeof document !== 'undefined' && document.body.classList.contains('theme-light'));
      setActiveTheme(isL ? 'light' : 'dark');
    };
    checkTheme();
    if (typeof document !== 'undefined') {
      const observer = new MutationObserver(checkTheme);
      observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'class'] });
      observer.observe(document.body, { attributes: true, attributeFilter: ['data-theme', 'class'] });
      return () => observer.disconnect();
    }
  }, [propTheme]);

  const isLight = activeTheme === 'light';

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
    { code: 'USD', name: 'US Dollar', defaultScore: -16.8, yield: 4.25, policy: 'Active Easing (Dovish)', growth: 'Resilient', group: 'Currencies' },
    { code: 'EUR', name: 'Euro', defaultScore: -2.0, yield: 2.38, policy: 'Gradual Easing', growth: 'Stabilizing', group: 'Currencies' },
    { code: 'GBP', name: 'British Pound', defaultScore: 6.1, yield: 4.12, policy: 'Cautious Cuts', growth: 'Sluggish', group: 'Currencies' },
    { code: 'JPY', name: 'Japanese Yen', defaultScore: 5.2, yield: 1.05, policy: 'Normalization (Hawkish)', growth: 'Weak Domestic', group: 'Currencies' },
    { code: 'CAD', name: 'Canadian Dollar', defaultScore: -21.1, yield: 3.25, policy: 'Active Easing', growth: 'Moderate', group: 'Currencies' },
    { code: 'AUD', name: 'Australian Dollar', defaultScore: 3.8, yield: 4.10, policy: 'Restrictive Hold', growth: 'China Drag', group: 'Currencies' },
    { code: 'NZD', name: 'New Zealand Dollar', defaultScore: -17.6, yield: 4.50, policy: 'Accelerated Cuts', growth: 'Recessionary', group: 'Currencies' },
    { code: 'CHF', name: 'Swiss Franc', defaultScore: -8.8, yield: 1.00, policy: 'Accommodative', growth: 'Subdued', group: 'Currencies' },
    { code: 'SEK', name: 'Swedish Krona', defaultScore: 12.0, yield: 2.75, policy: 'Paused / Neutral', growth: 'Stable', group: 'Currencies' },
    { code: 'NOK', name: 'Norwegian Krone', defaultScore: 5.0, yield: 4.50, policy: 'Restrictive Hold', growth: 'Stable', group: 'Currencies' },
    { code: 'CNY', name: 'Chinese Yuan', defaultScore: -17.6, yield: 2.10, policy: 'Active Easing', growth: 'Slowing', group: 'Currencies' },
    // Precious Metals & Commodities
    { code: 'XAU', name: 'Gold (Spot Bullion)', defaultScore: 16.5, yield: 0.00, policy: 'Reserve Asset / Real Rate Hedge', growth: 'Safe Haven Inflows', group: 'Precious Metals' },
    { code: 'XAG', name: 'Silver (Spot Bullion)', defaultScore: 15.0, yield: 0.00, policy: 'Dual Monetary & Industrial Asset', growth: 'Solar / Electrification Demand', group: 'Precious Metals' },
    { code: 'XPT', name: 'Platinum (Spot Bullion)', defaultScore: 15.0, yield: 0.00, policy: 'Structural Supply Deficit', growth: 'Catalytic & Hydrogen Demand', group: 'Precious Metals' },
    { code: 'COPPER', name: 'Copper (High Grade)', defaultScore: 15.0, yield: 0.00, policy: 'Electrification Mandate', growth: 'Infrastructure PMI Surge', group: 'Precious Metals' },
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
          background: isLight ? 'var(--surface-1)' : 'linear-gradient(180deg, #090e17 0%, #0c1424 100%)',
          padding: '16px 20px',
          borderRadius: 'var(--radius-md)',
          border: isLight ? '1px solid var(--border-subtle)' : '1px solid rgba(30, 58, 138, 0.35)',
          boxShadow: isLight ? 'var(--shadow-sm)' : 'none',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Swords size={20} color={isLight ? '#0284c7' : 'var(--accent-cyan)'} />
            <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
              MACRO BATTLE: Relative Fundamental Clash
            </h2>
            <span
              style={{
                fontSize: '0.68rem',
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: 4,
                background: isLight ? 'rgba(2, 132, 199, 0.12)' : 'rgba(56, 189, 248, 0.12)',
                color: isLight ? '#0284c7' : 'var(--accent-cyan)',
                border: isLight ? '1px solid rgba(2, 132, 199, 0.28)' : '1px solid rgba(56, 189, 248, 0.25)',
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
            <label style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontWeight: 700 }}>BASE:</label>
            <select
              value={baseCode}
              onChange={(e) => setBaseCode(e.target.value)}
              style={{
                background: isLight ? 'var(--surface-1)' : 'var(--surface-2)',
                border: isLight ? '1px solid var(--border-active)' : '1px solid var(--border-subtle)',
                color: 'var(--text-primary)',
                padding: '6px 12px',
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
                    {c.code} — {c.name}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Precious Metals & Commodities">
                {clashAssets.filter((c) => c.group === 'Precious Metals').map((c) => (
                  <option key={`base-${c.code}`} value={c.code}>
                    {c.code} — {c.name}
                  </option>
                ))}
              </optgroup>
            </select>
          </div>

          <span style={{ color: isLight ? '#0284c7' : 'var(--accent-cyan)', fontWeight: 800, fontSize: '0.8rem' }}>VS</span>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontWeight: 700 }}>QUOTE:</label>
            <select
              value={quoteCode}
              onChange={(e) => setQuoteCode(e.target.value)}
              style={{
                background: isLight ? 'var(--surface-1)' : 'var(--surface-2)',
                border: isLight ? '1px solid var(--border-active)' : '1px solid var(--border-subtle)',
                color: 'var(--text-primary)',
                padding: '6px 12px',
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
                    {c.code} — {c.name}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Precious Metals & Commodities">
                {clashAssets.filter((c) => c.group === 'Precious Metals').map((c) => (
                  <option key={`quote-${c.code}`} value={c.code} disabled={c.code === baseCode}>
                    {c.code} — {c.name}
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
            border: `1px solid ${
              isBaseAdvantaged
                ? isLight ? '#10b981' : 'rgba(16, 185, 129, 0.4)'
                : 'var(--border-subtle)'
            }`,
            borderRadius: 'var(--radius-lg)',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            position: 'relative',
            overflow: 'hidden',
            boxShadow: isLight ? 'var(--shadow-sm)' : 'none',
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
                padding: '3px 10px',
                borderRadius: 4,
                background: isLight ? '#dcfce7' : 'rgba(16, 185, 129, 0.2)',
                color: isLight ? '#15803d' : '#34d399',
                border: isLight ? '1px solid #86efac' : '1px solid rgba(16, 185, 129, 0.3)',
              }}
            >
              FUNDAMENTAL LEADER
            </div>
          )}

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <AssetEmblem code={baseCurr.code} size={38} />
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
                        background: isLight ? 'rgba(217, 119, 6, 0.12)' : 'rgba(234, 179, 8, 0.15)',
                        color: isLight ? '#b45309' : '#eab308',
                        border: isLight ? '1px solid rgba(217, 119, 6, 0.3)' : '1px solid rgba(234, 179, 8, 0.3)',
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
              <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700 }}>
                Macro Composite Score
              </div>
              <div
                className="mono"
                style={{
                  fontSize: '2.4rem',
                  fontWeight: 800,
                  color: baseScore >= 0
                    ? isLight ? '#059669' : '#10b981'
                    : isLight ? '#dc2626' : '#ef4444',
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
              <span className="mono" style={{ fontWeight: 700, color: isLight ? '#0284c7' : '#38bdf8' }}>
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
            border: isLight ? '1px solid var(--border-active)' : '1px solid var(--border-active)',
            borderRadius: 'var(--radius-lg)',
            padding: '24px 20px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minWidth: 210,
            boxShadow: isLight ? '0 4px 14px rgba(0,0,0,0.06)' : 'var(--shadow-md)',
            position: 'relative',
          }}
        >
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: '50%',
              background: isLight ? '#f1f5f9' : 'var(--surface-2)',
              border: isLight ? '1px solid #cbd5e1' : '1px solid var(--border-subtle)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 12,
            }}
          >
            <Scale size={20} color={isLight ? '#0284c7' : 'var(--accent-cyan)'} />
          </div>

          <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 800 }}>
            NET FUNDAMENTAL DELTA
          </span>

          <span
            className="mono"
            style={{
              fontSize: '2rem',
              fontWeight: 900,
              color: netScore > 0
                ? isLight ? '#059669' : '#10b981'
                : netScore < 0
                ? isLight ? '#dc2626' : '#ef4444'
                : isLight ? '#475569' : '#94a3b8',
              marginTop: 4,
            }}
          >
            {netScore > 0 ? `+${netScore}` : netScore}
          </span>

          <span
            style={{
              fontSize: '0.75rem',
              fontWeight: 800,
              padding: '3px 10px',
              borderRadius: 4,
              marginTop: 6,
              background: netScore > 10
                ? isLight ? '#dcfce7' : 'var(--color-bullish-bg)'
                : netScore < -10
                ? isLight ? '#fee2e2' : 'var(--color-bearish-bg)'
                : isLight ? '#f1f5f9' : 'var(--color-neutral-bg)',
              color: netScore > 10
                ? isLight ? '#15803d' : 'var(--color-bullish)'
                : netScore < -10
                ? isLight ? '#991b1b' : 'var(--color-bearish)'
                : isLight ? '#475569' : 'var(--text-secondary)',
              border: netScore > 10
                ? isLight ? '1px solid #86efac' : 'none'
                : netScore < -10
                ? isLight ? '1px solid #fca5a5' : 'none'
                : isLight ? '1px solid #cbd5e1' : 'none',
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
            Yield Diff:{' '}
            <strong
              className="mono"
              style={{
                color: Number(yieldDiff) >= 0
                  ? isLight ? '#059669' : 'var(--color-bullish)'
                  : isLight ? '#dc2626' : 'var(--color-bearish)',
              }}
            >
              {Number(yieldDiff) >= 0 ? `+${yieldDiff}%` : `${yieldDiff}%`}
            </strong>
          </div>

          {onSelectPairAsset && (
            <button
              onClick={() => onSelectPairAsset(pairSymbol)}
              style={{
                marginTop: 18,
                padding: '7px 14px',
                fontSize: '0.75rem',
                fontWeight: 700,
                color: '#ffffff',
                background: isLight ? '#2563eb' : 'var(--accent-blue)',
                border: 'none',
                borderRadius: 'var(--radius-sm)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                boxShadow: isLight ? '0 2px 8px rgba(37, 99, 235, 0.25)' : 'none',
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
            border: `1px solid ${
              isQuoteAdvantaged
                ? isLight ? '#10b981' : 'rgba(16, 185, 129, 0.4)'
                : 'var(--border-subtle)'
            }`,
            borderRadius: 'var(--radius-lg)',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            position: 'relative',
            overflow: 'hidden',
            boxShadow: isLight ? 'var(--shadow-sm)' : 'none',
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
                padding: '3px 10px',
                borderRadius: 4,
                background: isLight ? '#dcfce7' : 'rgba(16, 185, 129, 0.2)',
                color: isLight ? '#15803d' : '#34d399',
                border: isLight ? '1px solid #86efac' : '1px solid rgba(16, 185, 129, 0.3)',
              }}
            >
              FUNDAMENTAL LEADER
            </div>
          )}

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <AssetEmblem code={quoteCurr.code} size={38} />
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
                        background: isLight ? 'rgba(217, 119, 6, 0.12)' : 'rgba(234, 179, 8, 0.15)',
                        color: isLight ? '#b45309' : '#eab308',
                        border: isLight ? '1px solid rgba(217, 119, 6, 0.3)' : '1px solid rgba(234, 179, 8, 0.3)',
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
              <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700 }}>
                Macro Composite Score
              </div>
              <div
                className="mono"
                style={{
                  fontSize: '2.4rem',
                  fontWeight: 800,
                  color: quoteScore >= 0
                    ? isLight ? '#059669' : '#10b981'
                    : isLight ? '#dc2626' : '#ef4444',
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
              <span className="mono" style={{ fontWeight: 700, color: isLight ? '#0284c7' : '#38bdf8' }}>
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
          boxShadow: isLight ? 'var(--shadow-sm)' : 'none',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <Zap size={16} color={isLight ? '#0284c7' : 'var(--accent-cyan)'} />
          <h4 style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.04em', margin: 0 }}>
            What Is Causing The {pairSymbol} Fundamental Divergence?
          </h4>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
          {/* Card 1: Monetary Transmission or Opportunity Cost */}
          <div
            style={{
              background: isLight ? '#f8fafc' : 'var(--surface-2)',
              padding: '14px 16px',
              borderRadius: 'var(--radius-sm)',
              borderLeft: '3px solid #06b6d4',
              border: isLight ? '1px solid #e2e8f0' : 'none',
              borderLeftWidth: '3px',
              borderLeftColor: '#06b6d4',
            }}
          >
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              {isMetalClash ? '1. Real Interest Rates & Opportunity Cost' : '1. Central Bank & Monetary Stance'}
            </div>
            <div style={{ fontSize: '0.75rem', color: isLight ? '#334155' : 'var(--text-secondary)', marginTop: 4, lineHeight: 1.45 }}>
              {isCrossMetal
                ? `${baseCode} vs ${quoteCode} ratio is driven by industrial fabrication velocity vs pure bullion safe-haven holding demand.`
                : isMetalClash
                ? `${isBaseMetal ? baseCode : quoteCode} carries zero nominal yield; sovereign policy stance (${isBaseMetal ? quotePolicy.toLowerCase() : basePolicy.toLowerCase()}) and real 10Y sovereign yields govern the opportunity cost of holding physical metal.`
                : `${baseCode} policy stance is ${basePolicy.toLowerCase()} while ${quoteCode} is priced for ${quotePolicy.toLowerCase()}.`}
            </div>
          </div>

          {/* Card 2: Sovereign Yield Differential or Carry Drag */}
          <div
            style={{
              background: isLight ? '#f8fafc' : 'var(--surface-2)',
              padding: '14px 16px',
              borderRadius: 'var(--radius-sm)',
              borderLeft: '3px solid #10b981',
              border: isLight ? '1px solid #e2e8f0' : 'none',
              borderLeftWidth: '3px',
              borderLeftColor: '#10b981',
            }}
          >
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              {isMetalClash ? '2. Sovereign Carry & Yield Spread' : '2. Sovereign Yield Differential'}
            </div>
            <div style={{ fontSize: '0.75rem', color: isLight ? '#334155' : 'var(--text-secondary)', marginTop: 4, lineHeight: 1.45 }}>
              {isCrossMetal
                ? `Zero coupon differential across physical metals isolates performance to gold/silver beta and industrial supply crunches.`
                : isMetalClash
                ? `Yield spread of ${yieldDiff}% represents the carry penalty / financing friction of holding bullion against ${isBaseMetal ? quoteCode : baseCode} sovereign fixed-income paper.`
                : `Yield spread of ${yieldDiff}% creates persistent carry & institutional capital flows toward the higher-yielding sovereign paper.`}
            </div>
          </div>

          {/* Card 3: Economic Resilience or Reserve Inflows */}
          <div
            style={{
              background: isLight ? '#f8fafc' : 'var(--surface-2)',
              padding: '14px 16px',
              borderRadius: 'var(--radius-sm)',
              borderLeft: '3px solid #f59e0b',
              border: isLight ? '1px solid #e2e8f0' : 'none',
              borderLeftWidth: '3px',
              borderLeftColor: '#f59e0b',
            }}
          >
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              {isMetalClash ? '3. Central Bank Reserves & Geopolitical Hedging' : '3. Economic & Growth Resilience'}
            </div>
            <div style={{ fontSize: '0.75rem', color: isLight ? '#334155' : 'var(--text-secondary)', marginTop: 4, lineHeight: 1.45 }}>
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
