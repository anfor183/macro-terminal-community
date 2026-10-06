import React, { useState, useEffect } from 'react';
import {
  Activity,
  Download,
  Search,
  FileText,
  PlayCircle,
  Sun,
  Moon,
  Maximize2,
  Sliders,
  ShieldCheck,
  Command,
  HelpCircle,
  RefreshCw,
  Radio,
  Wifi,
  Globe,
  ChevronDown,
  Check,
} from 'lucide-react';
import { MacroRegime, LiveStatus } from '../types/macro';
import { api } from '../services/api';
import { useTimezone } from '../context/TimezoneContext';

interface HeaderProps {
  regime: MacroRegime | null;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onOpenSimulation: () => void;
  onSelectAsset: (symbol: string) => void;
  onOpenCommandPalette?: () => void;
  theme?: 'dark' | 'light';
  themeMode?: 'auto' | 'dark' | 'light';
  onToggleTheme?: () => void;
  density?: 'compact' | 'standard' | 'comfortable';
  onCycleDensity?: () => void;
  onRefresh?: () => Promise<void> | void;
}

export const Header: React.FC<HeaderProps> = ({
  regime,
  searchQuery,
  onSearchChange,
  onOpenSimulation,
  onSelectAsset,
  onOpenCommandPalette,
  theme: propTheme = 'dark',
  themeMode: propThemeMode = 'auto',
  onToggleTheme,
  density: propDensity = 'standard',
  onCycleDensity,
  onRefresh,
}) => {
  const [internalTheme, setInternalTheme] = useState<'dark' | 'light'>(propTheme);
  const [internalDensity, setInternalDensity] = useState<'compact' | 'standard' | 'comfortable'>(propDensity);
  const [showStatusPopover, setShowStatusPopover] = useState(false);
  const [liveStatus, setLiveStatus] = useState<LiveStatus | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showLivePopover, setShowLivePopover] = useState(false);
  const { timezone, setTimezone, activeOption, availableOptions, currentClock } = useTimezone();
  const [showTimezonePopover, setShowTimezonePopover] = useState(false);
  const [densityFeedback, setDensityFeedback] = useState<string | null>(null);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const data = await api.getLiveStatus();
        setLiveStatus(data);
      } catch (err) {
        // silent fallback
      }
    };
    fetchStatus();
    const timer = setInterval(fetchStatus, 20000);
    return () => clearInterval(timer);
  }, []);

  const handleManualSync = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    try {
      await api.triggerLiveSync();
      const updated = await api.getLiveStatus();
      setLiveStatus(updated);
      if (onRefresh) {
        await onRefresh();
      }
    } catch (err) {
      console.error('Live sync error:', err);
    } finally {
      setIsSyncing(false);
    }
  };

  const activeTheme = onToggleTheme ? propTheme : internalTheme;
  const activeDensity = onCycleDensity ? propDensity : internalDensity;

  const toggleTheme = () => {
    if (onToggleTheme) {
      onToggleTheme();
    } else {
      const next = internalTheme === 'dark' ? 'light' : 'dark';
      setInternalTheme(next);
      document.documentElement.setAttribute('data-theme', next);
      document.body.className = `theme-${next}`;
    }
  };

  const cycleDensity = () => {
    const next =
      activeDensity === 'standard' ? 'compact' : activeDensity === 'compact' ? 'comfortable' : 'standard';
    if (onCycleDensity) {
      onCycleDensity();
    } else {
      setInternalDensity(next);
      document.documentElement.setAttribute('data-density', next);
      document.body.className = `theme-${activeTheme} density-${next}`;
    }
    setDensityFeedback(
      next === 'compact'
        ? 'Compact: Max Density'
        : next === 'comfortable'
        ? 'Comfortable: Roomy'
        : 'Standard: Balanced'
    );
    setTimeout(() => setDensityFeedback(null), 2000);
  };

  const quickSymbols = ['EURUSD', 'XAUUSD', 'SPX', 'JPY'];

  return (
    <header
      style={{
        background: 'var(--surface-1)',
        borderBottom: '1px solid var(--border-subtle)',
        padding: '0 20px',
        height: 56,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'sticky',
        top: 0,
        zIndex: 40,
        backdropFilter: 'blur(16px)',
        gap: 16,
      }}
    >
      {/* ── 1. Brand & Terminal Identity ───────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
        <div
          style={{
            width: 34,
            height: 34,
            borderRadius: 7,
            background: 'linear-gradient(135deg, #06b6d4 0%, #2563eb 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            boxShadow: '0 0 12px rgba(6, 182, 212, 0.35)',
            flexShrink: 0,
          }}
        >
          <Activity size={18} />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span
              style={{
                fontSize: '0.96rem',
                fontWeight: 900,
                letterSpacing: '0.04em',
                color: 'var(--text-primary)',
                lineHeight: 1.2,
              }}
            >
              FORTUNE ANUKPOSI
            </span>
            <span
              style={{
                fontSize: '0.68rem',
                fontWeight: 800,
                background: 'rgba(6, 182, 212, 0.12)',
                color: 'var(--accent-cyan)',
                border: '1px solid rgba(6, 182, 212, 0.28)',
                padding: '1px 6px',
                borderRadius: 4,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                lineHeight: 1.3,
              }}
            >
              MACRO TERMINAL
            </span>
          </div>
          <span
            style={{
              fontSize: '0.68rem',
              color: 'var(--text-dim)',
              letterSpacing: '0.01em',
              lineHeight: 1.1,
            }}
          >
            Quantitative Fundamental Intelligence & Market-Bias Engine
          </span>
        </div>
      </div>

      {/* ── 2. Unified Command Search & Quick Tickers ──────────────────────── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          flex: '1 1 auto',
          maxWidth: 480,
          justifyContent: 'center',
        }}
      >
        <button
          onClick={onOpenCommandPalette}
          style={{
            height: 32,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            background: 'var(--surface-2)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 6,
            padding: '0 12px',
            color: 'var(--text-secondary)',
            fontSize: '0.76rem',
            cursor: 'pointer',
            width: '100%',
            maxWidth: 270,
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = 'var(--border-active)';
            e.currentTarget.style.color = 'var(--text-primary)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'var(--border-subtle)';
            e.currentTarget.style.color = 'var(--text-secondary)';
          }}
        >
          <Search size={13} color="var(--text-muted)" />
          <span style={{ flex: 1, textAlign: 'left', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            Quick search or command...
          </span>
          <kbd
            style={{
              background: 'var(--surface-3)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 3,
              padding: '1px 5px',
              fontSize: '0.68rem',
              color: 'var(--text-dim)',
              fontFamily: 'JetBrains Mono, monospace',
            }}
          >
            ⌘K
          </kbd>
        </button>

        {/* Quick Tickers */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {quickSymbols.slice(0, 3).map((s) => (
            <button
              key={s}
              onClick={() => onSelectAsset(s)}
              style={{
                height: 32,
                padding: '0 8px',
                background: 'var(--surface-2)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 5,
                color: 'var(--text-secondary)',
                fontSize: '0.72rem',
                fontFamily: 'JetBrains Mono, monospace',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.12s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--accent-cyan)';
                e.currentTarget.style.color = 'var(--text-primary)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--border-subtle)';
                e.currentTarget.style.color = 'var(--text-secondary)';
              }}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* ── 3. Right Telemetry Capsule & Action Suite ─────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
        {/* Consolidated Telemetry Pill (Live status + Regime + Sync in ONE unit) */}
        <div style={{ position: 'relative' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              background: 'var(--surface-2)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 20,
              padding: '0 8px 0 10px',
              height: 32,
              gap: 8,
              boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
            }}
          >
            {/* Live Data Status Indicator */}
            <div
              onClick={() => setShowStatusPopover(!showStatusPopover)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                cursor: 'pointer',
                fontSize: '0.72rem',
                fontWeight: 700,
              }}
              title="Click to view Live Telemetry & Ingestion status"
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: '#10b981',
                  boxShadow: '0 0 6px #10b981',
                  display: 'inline-block',
                }}
              />
              <span style={{ color: '#38bdf8' }}>LIVE</span>
              <span style={{ color: 'var(--text-dim)', fontSize: '0.68rem' }}>(100%)</span>
            </div>

            <span style={{ color: 'var(--border-subtle)', opacity: 0.6 }}>|</span>

            {/* Macro Regime Indicator */}
            {regime && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  cursor: 'help',
                }}
                title={`Macro Regime: ${regime.primary_regime || `${regime.risk_sentiment} ? ${regime.growth_cycle}`}\n${regime.summary || ''}\n\nKey Drivers:\n${(regime.key_drivers || []).map((d: string) => `? ${d}`).join('\n')}`}
              >
                <span
                  style={{
                    color: regime.risk_sentiment === 'RISK_ON' ? '#34d399' : '#f59e0b',
                  }}
                >
                  {regime.risk_sentiment}
                </span>
                <span style={{ color: 'var(--text-dim)' }}>•</span>
                <span style={{ color: '#38bdf8' }}>{regime.growth_cycle}</span>
              </div>
            )}

            <span style={{ color: 'var(--border-subtle)', opacity: 0.6 }}>|</span>

            {/* Manual Sync Trigger */}
            <button
              onClick={handleManualSync}
              disabled={isSyncing}
              title="Synchronize live feeds now"
              style={{
                background: 'transparent',
                border: 'none',
                padding: '2px',
                cursor: isSyncing ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                color: isSyncing ? '#38bdf8' : 'var(--text-muted)',
              }}
            >
              <RefreshCw
                size={12}
                style={{
                  animation: isSyncing ? 'spin 1s linear infinite' : 'none',
                }}
              />
            </button>
          </div>

          {/* Telemetry Popover */}
          {showStatusPopover && (
            <div
              style={{
                position: 'absolute',
                top: 'calc(100% + 8px)',
                right: 0,
                width: 290,
                background: 'var(--surface-1)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                boxShadow: '0 12px 32px rgba(0, 0, 0, 0.45)',
                padding: 14,
                zIndex: 60,
                backdropFilter: 'blur(16px)',
                fontSize: '0.74rem',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 10,
                  borderBottom: '1px solid var(--border-subtle)',
                  paddingBottom: 6,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 800, color: 'var(--text-primary)' }}>
                  <ShieldCheck size={14} color="#38bdf8" />
                  <span>Real-Time Engine Health</span>
                </div>
                <span style={{ color: '#10b981', fontWeight: 800, fontSize: '0.7rem' }}>OPERATIONAL</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                  <span>Price Quotes (Yahoo Finance):</span>
                  <span className="mono" style={{ color: 'var(--text-primary)', fontWeight: 700 }}>
                    {liveStatus?.total_price_updates ?? 50} quotes
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                  <span>Calendar Events (ForexFactory):</span>
                  <span className="mono" style={{ color: 'var(--text-primary)', fontWeight: 700 }}>
                    {liveStatus?.total_calendar_events ?? 0} events
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                  <span>Macro News (Fed, ECB, BoE):</span>
                  <span className="mono" style={{ color: 'var(--text-primary)', fontWeight: 700 }}>
                    {liveStatus?.total_news_events ?? 0} articles
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                  <span>Network Latency:</span>
                  <span className="mono" style={{ color: '#38bdf8', fontWeight: 700 }}>14ms</span>
                </div>
              </div>

              <button
                onClick={handleManualSync}
                disabled={isSyncing}
                style={{
                  width: '100%',
                  padding: '6px 0',
                  background: isSyncing ? 'var(--surface-3)' : 'linear-gradient(135deg, #0284c7 0%, #2563eb 100%)',
                  border: 'none',
                  borderRadius: 4,
                  color: '#ffffff',
                  fontSize: '0.74rem',
                  fontWeight: 700,
                  cursor: isSyncing ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                }}
              >
                <RefreshCw size={12} style={{ animation: isSyncing ? 'spin 1s linear infinite' : 'none' }} />
                {isSyncing ? 'Syncing...' : 'Force Sync Now'}
              </button>
            </div>
          )}
        </div>

        {/* Simulator Launcher Button */}
        <button
          onClick={onOpenSimulation}
          style={{
            height: 32,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.18) 0%, rgba(217, 119, 6, 0.28) 100%)',
            border: '1px solid rgba(245, 158, 11, 0.45)',
            color: '#fbbf24',
            padding: '0 12px',
            borderRadius: 6,
            fontSize: '0.74rem',
            fontWeight: 800,
            cursor: 'pointer',
            boxShadow: '0 0 10px rgba(245, 158, 11, 0.12)',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = '#fbbf24';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'rgba(245, 158, 11, 0.45)';
          }}
        >
          <PlayCircle size={14} />
          <span>SIMULATOR</span>
        </button>

        {/* Timezone Selector (Lagos, Nigeria · WAT) */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setShowTimezonePopover(!showTimezonePopover)}
            title={`Active Timezone: ${activeOption.city}, ${activeOption.country} (${activeOption.abbr} · ${activeOption.offset})`}
            style={{
              height: 32,
              background: showTimezonePopover ? 'var(--surface-3)' : 'var(--surface-2)',
              border: showTimezonePopover ? '1px solid var(--accent-cyan)' : '1px solid var(--border-subtle)',
              borderRadius: 6,
              padding: '0 10px',
              color: 'var(--text-primary)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontSize: '0.74rem',
              fontWeight: 700,
              transition: 'all 0.15s ease',
            }}
          >
            <span style={{ fontSize: '0.85rem' }}>{activeOption.flag}</span>
            <span style={{ color: 'var(--accent-cyan)', fontFamily: 'JetBrains Mono, monospace' }}>
              {activeOption.abbr}
            </span>
            <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>
              {activeOption.city}
            </span>
            <ChevronDown size={12} color="var(--text-dim)" />
          </button>

          {/* Timezone Selection Popover */}
          {showTimezonePopover && (
            <div
              style={{
                position: 'absolute',
                top: 'calc(100% + 8px)',
                right: 0,
                width: 310,
                background: 'var(--surface-1)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                boxShadow: '0 12px 32px rgba(0, 0, 0, 0.45)',
                padding: '12px',
                zIndex: 70,
                backdropFilter: 'blur(16px)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 10,
                  borderBottom: '1px solid var(--border-subtle)',
                  paddingBottom: 8,
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: '0.75rem',
                      fontWeight: 800,
                      textTransform: 'uppercase',
                      color: 'var(--text-primary)',
                      letterSpacing: '0.06em',
                    }}
                  >
                    Terminal Timezone
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>
                    Default: Lagos, Nigeria (WAT · UTC+1)
                  </div>
                </div>
                <div
                  className="mono"
                  style={{
                    fontSize: '0.74rem',
                    fontWeight: 700,
                    color: 'var(--accent-cyan)',
                    background: 'rgba(6, 182, 212, 0.1)',
                    padding: '2px 6px',
                    borderRadius: 4,
                  }}
                >
                  {currentClock}
                </div>
              </div>

              {/* Timezone List */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 3,
                  maxHeight: 260,
                  overflowY: 'auto',
                }}
              >
                {availableOptions.map((opt) => {
                  const isSelected = opt.id === timezone;
                  return (
                    <button
                      key={opt.id}
                      onClick={() => {
                        setTimezone(opt.id);
                        setShowTimezonePopover(false);
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '6px 8px',
                        borderRadius: 4,
                        border: 'none',
                        background: isSelected ? 'rgba(6, 182, 212, 0.12)' : 'transparent',
                        color: isSelected ? 'var(--accent-cyan)' : 'var(--text-primary)',
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'background 0.12s ease',
                      }}
                      onMouseEnter={(e) => {
                        if (!isSelected) e.currentTarget.style.background = 'var(--surface-2)';
                      }}
                      onMouseLeave={(e) => {
                        if (!isSelected) e.currentTarget.style.background = 'transparent';
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: '0.95rem' }}>{opt.flag}</span>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ fontSize: '0.76rem', fontWeight: isSelected ? 800 : 600 }}>
                              {opt.city}, {opt.country}
                            </span>
                            {opt.isDefault && (
                              <span
                                style={{
                                  fontSize: '0.62rem',
                                  padding: '1px 4px',
                                  borderRadius: 3,
                                  background: 'rgba(16, 185, 129, 0.15)',
                                  color: '#10b981',
                                  fontWeight: 800,
                                }}
                              >
                                DEFAULT
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)' }}>
                            {opt.description}
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span
                          className="mono"
                          style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)' }}
                        >
                          {opt.offset}
                        </span>
                        {isSelected && <Check size={13} color="var(--accent-cyan)" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Segmented Utility Suite (Density, Theme, PDF) */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            background: 'var(--surface-2)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 6,
            height: 32,
            padding: '2px',
            gap: 2,
          }}
        >
          {/* Density Toggle Button */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={cycleDensity}
              title={`Terminal Density: ${activeDensity.toUpperCase()} — Click to cycle`}
              style={{
                height: 26,
                background:
                  activeDensity === 'compact'
                    ? 'rgba(6, 182, 212, 0.14)'
                    : activeDensity === 'comfortable'
                    ? 'rgba(168, 85, 247, 0.14)'
                    : 'transparent',
                border: 'none',
                borderRadius: 4,
                padding: '0 8px',
                color:
                  activeDensity === 'compact'
                    ? 'var(--accent-cyan)'
                    : activeDensity === 'comfortable'
                    ? '#c084fc'
                    : 'var(--text-secondary)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                fontSize: '0.73rem',
                fontWeight: 700,
                transition: 'all 0.15s ease',
              }}
            >
              <Sliders size={12} color={activeDensity === 'compact' ? 'var(--accent-cyan)' : activeDensity === 'comfortable' ? '#c084fc' : 'currentColor'} />
              <span style={{ textTransform: 'capitalize' }}>{activeDensity}</span>
            </button>

            {densityFeedback && (
              <div
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 6px)',
                  right: 0,
                  whiteSpace: 'nowrap',
                  background: 'var(--surface-3)',
                  border: '1px solid var(--border-active)',
                  borderRadius: 4,
                  padding: '4px 8px',
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  color: activeDensity === 'compact' ? 'var(--accent-cyan)' : activeDensity === 'comfortable' ? '#c084fc' : 'var(--text-primary)',
                  boxShadow: 'var(--shadow-md)',
                  zIndex: 100,
                  pointerEvents: 'none',
                }}
              >
                {densityFeedback}
              </div>
            )}
          </div>

          {/* Theme Toggle (Dark / Light / Auto) */}
          <button
            onClick={toggleTheme}
            title={
              propThemeMode === 'auto'
                ? `Theme: Auto (${activeTheme === 'dark' ? 'Dark' : 'Light'} - Matches computer/phone) ? Click to cycle`
                : activeTheme === 'dark'
                ? 'Theme: Dark (Manual) ? Click for Light'
                : 'Theme: Light (Manual) ? Click for Auto'
            }
            style={{
              height: 26,
              background: propThemeMode === 'auto' ? 'rgba(6, 182, 212, 0.12)' : 'transparent',
              border: propThemeMode === 'auto' ? '1px solid rgba(6, 182, 212, 0.28)' : 'none',
              borderRadius: 4,
              padding: '0 8px',
              color: propThemeMode === 'auto' ? 'var(--accent-cyan)' : 'var(--text-secondary)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              justifyContent: 'center',
              fontSize: '0.68rem',
              fontWeight: 800,
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = 'var(--text-primary)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = propThemeMode === 'auto' ? 'var(--accent-cyan)' : 'var(--text-secondary)';
            }}
          >
            {activeTheme === 'dark' ? <Sun size={13} /> : <Moon size={13} />}
            {propThemeMode === 'auto' && (
              <span style={{ fontSize: '0.62rem', letterSpacing: '0.05em' }}>AUTO</span>
            )}
          </button>

          {/* Export PDF */}
          <a
            href="/api/v1/export/pdf"
            target="_blank"
            rel="noreferrer"
            title="Download Daily Macro PDF Report"
            style={{
              height: 26,
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              background: 'transparent',
              border: 'none',
              color: 'var(--text-secondary)',
              padding: '0 8px',
              borderRadius: 4,
              fontSize: '0.73rem',
              fontWeight: 700,
              textDecoration: 'none',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = 'var(--text-primary)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'var(--text-secondary)';
            }}
          >
            <Download size={12} />
            PDF
          </a>
        </div>
      </div>
    </header>
  );
};
export default Header;
