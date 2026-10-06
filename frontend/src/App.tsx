import React, { useEffect, useState } from 'react';
import { Header } from './components/Header';
import { Sidebar, ViewTab } from './components/Sidebar';
import { DashboardView } from './components/DashboardView';
import { AssetTable } from './components/AssetTable';
import { CurrencyMatrixView } from './components/CurrencyMatrixView';
import { COTReportView } from './components/COTReportView';
import { ForexRankingsView } from './components/ForexRankingsView';
import { GoldTerminalView, OilTerminalView } from './components/SpecializedDashboards';
import { CalendarView } from './components/CalendarView';
import { NewsIntelligenceView } from './components/NewsIntelligenceView';
import { WhatChangedView } from './components/WhatChangedView';
import { BacktestView } from './components/BacktestView';
import { SystemHealthView } from './components/SystemHealthView';
import { ValidationDashboard } from './components/ValidationDashboard';
import { DataIntegrityDashboard } from './components/DataIntegrityDashboard';
import { RegimeScannerView } from './components/RegimeScannerView';
import { AssetDetailModal } from './components/AssetDetailModal';
import { SimulationModal } from './components/SimulationModal';
import { CommandPalette } from './components/CommandPalette';
import { MacroBattleView } from './components/MacroBattleView';
import { WatchlistPortfolio } from './components/WatchlistPortfolio';
import { EvidenceDrawer } from './components/EvidenceDrawer';
import { AICopilotView } from './components/AICopilotView';
import { AssetItem, MacroRegime, WhatChangedItem, CalendarEvent } from './types/macro';
import { api } from './services/api';

export function App() {
  const [activeTab, setActiveTab] = useState<ViewTab>(() => {
    if (typeof window !== 'undefined') {
      const hash = window.location.hash.replace('#', '') as ViewTab;
      const validTabs: ViewTab[] = [
        'dashboard', 'battle', 'watchlist', 'forex', 'matrix', 'cot_report', 'gold', 'oil',
        'indices', 'ai_copilot', 'calendar', 'news', 'what_changed', 'backtest',
        'regime_scanner', 'validation', 'integrity', 'health'
      ];
      if (validTabs.includes(hash)) return hash;
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get('tab') as ViewTab;
      if (tabParam && validTabs.includes(tabParam)) return tabParam;
    }
    return 'dashboard';
  });
  const [regime, setRegime] = useState<MacroRegime | null>(null);
  const [assets, setAssets] = useState<AssetItem[]>([]);
  const [whatChanged, setWhatChanged] = useState<WhatChangedItem[]>([]);
  const [calendar, setCalendar] = useState<CalendarEvent[]>([]);
  const [currencies, setCurrencies] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');

  const [selectedAsset, setSelectedAsset] = useState<string | null>(null);
  const [isSimulationOpen, setIsSimulationOpen] = useState<boolean>(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState<boolean>(false);
  const [isEvidenceDrawerOpen, setIsEvidenceDrawerOpen] = useState<boolean>(false);
  const [battleCurrencies, setBattleCurrencies] = useState<{ base: string; quote: string }>({
    base: 'EUR',
    quote: 'USD',
  });
  const [loading, setLoading] = useState<boolean>(true);

  // System Theme Sensitivity: Detects computer or phone dark / light theme automatically
  const getSystemTheme = (): 'dark' | 'light' => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'dark';
  };

  const [themeMode, setThemeMode] = useState<'auto' | 'dark' | 'light'>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const themeParam = params.get('theme');
      if (themeParam === 'light' || themeParam === 'dark' || themeParam === 'auto') {
        return themeParam as 'auto' | 'dark' | 'light';
      }
      const savedMode = localStorage.getItem('terminal-theme-mode');
      if (savedMode === 'light' || savedMode === 'dark' || savedMode === 'auto') {
        return savedMode as 'auto' | 'dark' | 'light';
      }
      const legacySaved = localStorage.getItem('terminal-theme');
      if (legacySaved === 'light' || legacySaved === 'dark') {
        return legacySaved as 'dark' | 'light';
      }
    }
    return 'auto'; // Default: Automatically sensitive to device system theme!
  });

  const [activeTheme, setActiveTheme] = useState<'dark' | 'light'>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const themeParam = params.get('theme');
      if (themeParam === 'light' || themeParam === 'dark') return themeParam;
      const savedMode = localStorage.getItem('terminal-theme-mode');
      if (savedMode === 'light' || savedMode === 'dark') return savedMode;
      if (savedMode === 'auto') return getSystemTheme();
      const legacySaved = localStorage.getItem('terminal-theme');
      if (legacySaved === 'light' || legacySaved === 'dark') return legacySaved;
      return getSystemTheme();
    }
    return 'dark';
  });

  // Listen dynamically to OS / Phone theme changes (instant response without reload)
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const handleSystemChange = (e: MediaQueryListEvent) => {
      if (themeMode === 'auto') {
        const next = e.matches ? 'dark' : 'light';
        setActiveTheme(next);
      }
    };

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleSystemChange);
      return () => mediaQuery.removeEventListener('change', handleSystemChange);
    } else if ((mediaQuery as any).addListener) {
      (mediaQuery as any).addListener(handleSystemChange);
      return () => (mediaQuery as any).removeListener(handleSystemChange);
    }
  }, [themeMode]);

  const [density, setDensity] = useState<'compact' | 'standard' | 'comfortable'>(() => {
    const saved = localStorage.getItem('terminal-density');
    return saved === 'compact' || saved === 'comfortable' ? saved : 'standard';
  });

  const loadAllData = async (triggerSync = false) => {
    try {
      if (triggerSync) {
        await api.triggerLiveSync();
      }
      const [regData, astData, wcData, calData, currData] = await Promise.all([
        api.getRegime(),
        api.getAssets(),
        api.getWhatChanged(),
        api.getCalendar(),
        api.getCurrencyRanking(),
      ]);
      setRegime(regData);
      setAssets(astData);
      setWhatChanged(wcData);
      setCalendar(calData);
      setCurrencies(currData);
    } catch (err) {
      console.error('Failed loading macro data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleTheme = () => {
    setThemeMode((prev) => {
      let nextMode: 'auto' | 'dark' | 'light';
      if (prev === 'auto') {
        nextMode = activeTheme === 'dark' ? 'light' : 'dark';
      } else if (prev === 'dark') {
        nextMode = 'light';
      } else {
        nextMode = 'auto'; // Return to device auto sync!
      }
      return nextMode;
    });
  };

  useEffect(() => {
    const current = themeMode === 'auto' ? getSystemTheme() : themeMode;
    setActiveTheme(current);
    document.documentElement.setAttribute('data-theme', current);
    document.documentElement.setAttribute('data-theme-mode', themeMode);
    document.documentElement.className = `theme-${current}`;
    document.documentElement.setAttribute('data-density', density);
    document.body.setAttribute('data-theme', current);
    document.body.setAttribute('data-density', density);
    document.body.className = `theme-${current} density-${density}`;
    localStorage.setItem('terminal-theme-mode', themeMode);
    localStorage.setItem('terminal-theme', current);
    localStorage.setItem('terminal-density', density);
  }, [themeMode, density]);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.hash.replace('#', '') !== activeTab) {
      window.location.hash = activeTab;
    }
  }, [activeTab]);

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '') as ViewTab;
      if (hash && hash !== activeTab) setActiveTab(hash);
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [activeTab]);

  useEffect(() => {
    loadAllData(false);
    // Continuous auto-refresh interval every 30s across the platform
    const interval = setInterval(() => loadAllData(false), 30000);
    return () => clearInterval(interval);
  }, []);

  // Global keyboard shortcut for Command Palette (Cmd/Ctrl + K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Filter assets by search query if present
  const searchedAssets = searchQuery.trim()
    ? assets.filter(
        (a) =>
          a.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
          a.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : assets;

  const handleOpenMacroBattle = (base: string, quote: string) => {
    setBattleCurrencies({ base, quote });
    setActiveTab('battle');
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        width: '100vw',
        overflow: 'hidden',
        background: 'var(--bg-main)',
      }}
    >
      {/* Top Header with terminal controls */}
      <Header
        regime={regime}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onOpenSimulation={() => setIsSimulationOpen(true)}
        onSelectAsset={(sym) => setSelectedAsset(sym)}
        onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
        theme={activeTheme}
        themeMode={themeMode}
        onToggleTheme={handleToggleTheme}
        density={density}
        onCycleDensity={() =>
          setDensity((d) =>
            d === 'standard' ? 'compact' : d === 'compact' ? 'comfortable' : 'standard'
          )
        }
        onRefresh={() => loadAllData(true)}
      />

      {/* Main Terminal Workspace */}
      <div style={{ display: 'flex', flex: 1, minHeight: 0, overflow: 'hidden' }}>
        {/* Left Navigation Sidebar */}
        <Sidebar
          activeTab={activeTab}
          onTabChange={setActiveTab}
          unreadAlertsCount={3}
        />

        {/* Center View Area */}
        <main
          style={{
            flex: 1,
            minHeight: 0,
            height: '100%',
            padding: '20px 28px',
            overflowY: 'auto',
          }}
        >
          {searchQuery.trim() ? (
            <div>
              <div
                style={{
                  marginBottom: 14,
                  fontSize: '0.85rem',
                  color: 'var(--text-secondary)',
                }}
              >
                Search results for: <strong style={{ color: 'var(--accent-cyan)' }}>"{searchQuery}"</strong> ({searchedAssets.length} matches)
              </div>
              <AssetTable
                assets={searchedAssets}
                onSelectAsset={setSelectedAsset}
                title="Search Filtered Trading Assets"
              />
            </div>
          ) : activeTab === 'dashboard' ? (
            <DashboardView
              regime={regime}
              assets={assets}
              whatChanged={whatChanged}
              calendar={calendar}
              currencies={currencies}
              onSelectAsset={setSelectedAsset}
              onNavigateTab={setActiveTab}
              onOpenEvidence={() => setIsEvidenceDrawerOpen(true)}
              onRefresh={() => loadAllData(true)}
              density={density}
            />
          ) : activeTab === 'battle' ? (
            <MacroBattleView
              initialBase={battleCurrencies.base}
              initialQuote={battleCurrencies.quote}
              onSelectPairAsset={setSelectedAsset}
            />
          ) : activeTab === 'watchlist' ? (
            <WatchlistPortfolio
              assets={assets}
              onSelectAsset={setSelectedAsset}
            />
          ) : activeTab === 'forex' ? (
            <ForexRankingsView onSelectAsset={setSelectedAsset} />
          ) : activeTab === 'matrix' ? (
            <CurrencyMatrixView
              theme={activeTheme}
              onSelectPairAsset={setSelectedAsset}
              onOpenMacroBattle={handleOpenMacroBattle}
              onRefresh={() => loadAllData(false)}
            />
          ) : activeTab === 'cot_report' ? (
            <COTReportView theme={activeTheme} onSelectAsset={setSelectedAsset} />
          ) : activeTab === 'gold' ? (
            <GoldTerminalView />
          ) : activeTab === 'oil' ? (
            <OilTerminalView />
          ) : activeTab === 'indices' ? (
            <AssetTable
              assets={assets.filter((a) => a.asset_class === 'index')}
              onSelectAsset={setSelectedAsset}
              title="Global Equity Indices Macro Landscape"
            />
          ) : activeTab === 'ai_copilot' ? (
            <AICopilotView />
          ) : activeTab === 'calendar' ? (
            <CalendarView onSelectAsset={setSelectedAsset} />
          ) : activeTab === 'news' ? (
            <NewsIntelligenceView onSelectAsset={setSelectedAsset} />
          ) : activeTab === 'what_changed' ? (
            <WhatChangedView onSelectAsset={setSelectedAsset} onRefresh={() => loadAllData(false)} />
          ) : activeTab === 'backtest' ? (
            <BacktestView />
          ) : activeTab === 'regime_scanner' ? (
            <RegimeScannerView />
          ) : activeTab === 'validation' ? (
            <ValidationDashboard />
          ) : activeTab === 'integrity' ? (
            <DataIntegrityDashboard />
          ) : activeTab === 'health' ? (
            <SystemHealthView />
          ) : null}
        </main>
      </div>

      {/* Terminal Status & Copyright Footer */}
      <footer
        style={{
          padding: '7px 24px',
          borderTop: '1px solid var(--border-subtle)',
          background: 'var(--surface-1)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '0.75rem',
          color: 'var(--text-muted)',
          zIndex: 30,
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
            Fortune Anukposi Quantitative Macro Terminal
          </span>
          <span style={{ color: 'var(--border-strong)' }}>|</span>
          <span>Institutional Fundamental Intelligence Engine</span>
        </div>
        <div>
          © {new Date().getFullYear()} Fortune Anukposi. All rights reserved.
        </div>
      </footer>

      {/* Global Command Palette (Cmd + K) */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        assets={assets}
        onSelectAsset={(sym) => {
          setSelectedAsset(sym);
          setIsCommandPaletteOpen(false);
        }}
        onNavigateTab={(tab) => {
          setActiveTab(tab as ViewTab);
          setIsCommandPaletteOpen(false);
        }}
        onOpenSimulation={() => {
          setIsSimulationOpen(true);
          setIsCommandPaletteOpen(false);
        }}
        theme={activeTheme}
        onToggleTheme={handleToggleTheme}
        density={density}
        onChangeDensity={(newDensity) => setDensity(newDensity)}
      />

      {/* Deep Dive Asset Inspection Modal */}
      {selectedAsset && (
        <AssetDetailModal
          symbol={selectedAsset}
          onClose={() => setSelectedAsset(null)}
        />
      )}

      {/* Global Evidence Provenance Drawer */}
      <EvidenceDrawer
        isOpen={isEvidenceDrawerOpen}
        onClose={() => setIsEvidenceDrawerOpen(false)}
      />

      {/* Macro Scenario Simulator Modal */}
      <SimulationModal
        isOpen={isSimulationOpen}
        onClose={() => setIsSimulationOpen(false)}
        onSimulationSuccess={() => {
          loadAllData();
        }}
      />
    </div>
  );
}

export default App;
