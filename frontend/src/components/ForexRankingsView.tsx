import React, { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown, ArrowUpDown, RefreshCw, ChevronRight, Coins, Globe, Layers } from 'lucide-react';
import { ForexRankingItem } from '../types/macro';
import { api } from '../services/api';
import { getBiasBadgeClass } from './AssetTable';

export const ForexRankingsView: React.FC<{ onSelectAsset?: (symbol: string) => void }> = ({ onSelectAsset }) => {
  const [pairs, setPairs] = useState<ForexRankingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'forex' | 'metals'>('all');

  const loadData = () => {
    setLoading(true);
    api.getForexRankings()
      .then(setPairs)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  const forexCount = pairs.filter((p) => p.asset_class !== 'metal').length;
  const metalsCount = pairs.filter((p) => p.asset_class === 'metal').length;

  const filteredPairs = pairs.filter((p) => {
    if (activeTab === 'forex') return p.asset_class !== 'metal';
    if (activeTab === 'metals') return p.asset_class === 'metal';
    return true;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* View Header with Filter Tabs */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
              Macro & Forex Pairs Fundamental Conviction Rankings
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
              {filteredPairs.length} Ranked Pairs
            </span>
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 4 }}>
            Ranked by fundamental conviction (|Tactical Macro Score| × Confidence %) • Multi-asset quantitative relative value
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Asset Class Filter Tabs */}
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
              onClick={() => setActiveTab('all')}
              style={{
                padding: '5px 12px',
                fontSize: '0.75rem',
                fontWeight: 700,
                borderRadius: 4,
                border: 'none',
                background: activeTab === 'all' ? 'var(--accent-blue)' : 'transparent',
                color: activeTab === 'all' ? '#fff' : 'var(--text-muted)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                transition: 'all 0.15s ease',
              }}
            >
              <Layers size={13} />
              All Pairs ({pairs.length})
            </button>
            <button
              onClick={() => setActiveTab('forex')}
              style={{
                padding: '5px 12px',
                fontSize: '0.75rem',
                fontWeight: 700,
                borderRadius: 4,
                border: 'none',
                background: activeTab === 'forex' ? 'var(--accent-blue)' : 'transparent',
                color: activeTab === 'forex' ? '#fff' : 'var(--text-muted)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                transition: 'all 0.15s ease',
              }}
            >
              <Globe size={13} />
              Forex Pairs ({forexCount})
            </button>
            <button
              onClick={() => setActiveTab('metals')}
              style={{
                padding: '5px 12px',
                fontSize: '0.75rem',
                fontWeight: 700,
                borderRadius: 4,
                border: 'none',
                background: activeTab === 'metals' ? '#eab308' : 'transparent',
                color: activeTab === 'metals' ? '#000' : 'var(--text-muted)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                transition: 'all 0.15s ease',
              }}
            >
              <Coins size={13} />
              Precious Metals ({metalsCount})
            </button>
          </div>

          <button
            onClick={loadData}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              background: 'var(--bg-card)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-secondary)',
              padding: '6px 12px',
              borderRadius: 6,
              fontSize: '0.75rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 8,
        overflow: 'hidden',
        boxShadow: 'var(--shadow-sm)',
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.8rem' }}>
          <thead>
            <tr style={{
              background: 'var(--surface-2)',
              borderBottom: '1px solid var(--border-subtle)',
              color: 'var(--text-muted)',
              fontSize: '0.75rem',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}>
              <th style={{ padding: '10px 16px', width: 60 }}>Rank</th>
              <th style={{ padding: '10px 16px' }}>Pair / Asset</th>
              <th style={{ padding: '10px 14px' }}>Fundamental Conviction</th>
              <th style={{ padding: '10px 14px' }}>Macro Score</th>
              <th style={{ padding: '10px 14px' }}>Tactical Bias</th>
              <th style={{ padding: '10px 14px' }}>Confidence</th>
              <th style={{ padding: '10px 16px' }}>Primary Macro Transmission</th>
              <th style={{ padding: '10px 12px', textAlign: 'center', width: 60 }}>Inspect</th>
            </tr>
          </thead>
          <tbody>
            {filteredPairs.map((p, idx) => {
              const isPositive = p.tactical_score >= 0;
              const isMetal = p.asset_class === 'metal';
              const displayRank = activeTab === 'all' ? p.rank : idx + 1;

              return (
                <tr
                  key={p.symbol}
                  onClick={() => onSelectAsset && onSelectAsset(p.symbol)}
                  style={{
                    borderBottom: '1px solid var(--border-subtle)',
                    cursor: 'pointer',
                    transition: 'background 0.12s ease',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-card-hover)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <td className="mono" style={{ padding: '12px 16px', fontWeight: 700, color: displayRank <= 3 ? '#fbbf24' : 'var(--text-muted)' }}>
                    #{displayRank}
                  </td>

                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span className="mono" style={{ fontSize: '0.92rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                        {p.symbol}
                      </span>
                      {isMetal && (
                        <span
                          style={{
                            fontSize: '0.65rem',
                            fontWeight: 800,
                            padding: '1px 6px',
                            borderRadius: 4,
                            background: 'rgba(234, 179, 8, 0.15)',
                            color: '#eab308',
                            border: '1px solid rgba(234, 179, 8, 0.3)',
                            letterSpacing: '0.04em',
                          }}
                        >
                          METAL
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>
                      {p.name}
                    </div>
                  </td>

                  {/* Conviction Score */}
                  <td className="mono" style={{ padding: '12px 14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontWeight: 800, fontSize: '0.9rem', color: isMetal ? '#eab308' : 'var(--accent-cyan)' }}>
                        {p.conviction_score.toFixed(1)}
                      </span>
                      <div style={{ width: 50, height: 4, background: 'var(--surface-3)', borderRadius: 2, overflow: 'hidden' }}>
                        <div
                          style={{
                            width: `${Math.min(100, (p.conviction_score / 50) * 100)}%`,
                            height: '100%',
                            background: isMetal ? '#eab308' : 'var(--accent-cyan)',
                          }}
                        />
                      </div>
                    </div>
                  </td>

                  <td className="mono" style={{ padding: '12px 14px', fontWeight: 700, color: isPositive ? 'var(--color-bullish)' : 'var(--color-bearish)' }}>
                    {p.tactical_score > 0 ? `+${p.tactical_score.toFixed(1)}` : p.tactical_score.toFixed(1)}
                  </td>

                  <td style={{ padding: '12px 14px' }}>
                    <span className={getBiasBadgeClass(p.bias)}>
                      {p.bias}
                    </span>
                  </td>

                  <td className="mono" style={{ padding: '12px 14px', color: 'var(--text-primary)', fontWeight: 600 }}>
                    {p.confidence.toFixed(0)}%
                  </td>

                  <td style={{ padding: '12px 16px', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    {p.primary_driver}
                  </td>

                  <td style={{ padding: '12px 12px', textAlign: 'center' }}>
                    <ChevronRight size={16} color="var(--text-dim)" />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
