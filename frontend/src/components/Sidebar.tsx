import React, { useState } from 'react';
import {
  LayoutDashboard,
  Swords,
  Star,
  Grid3X3,
  FileSpreadsheet,
  TrendingUp,
  Sparkles,
  Droplet,
  BarChart2,
  Calendar,
  Newspaper,
  History,
  Activity,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  FlaskConical,
  DatabaseZap,
  ScanSearch,
  Brain,
} from 'lucide-react';

export type ViewTab =
  | 'dashboard'
  | 'battle'
  | 'watchlist'
  | 'forex'
  | 'matrix'
  | 'cot_report'
  | 'gold'
  | 'oil'
  | 'indices'
  | 'ai_copilot'
  | 'calendar'
  | 'news'
  | 'what_changed'
  | 'backtest'
  | 'regime_scanner'
  | 'validation'
  | 'integrity'
  | 'health';

interface SidebarProps {
  activeTab: ViewTab;
  onTabChange: (tab: ViewTab) => void;
  unreadAlertsCount: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onTabChange,
  unreadAlertsCount,
}) => {
  const [collapsed, setCollapsed] = useState(false);

  const sections: Array<{
    title: string;
    items: Array<{ id: ViewTab; label: string; icon: React.ReactNode; badge?: string | number }>;
  }> = [
    {
      title: 'Macro Core',
      items: [
        { id: 'dashboard', label: 'Terminal Overview', icon: <LayoutDashboard size={17} /> },
        { id: 'battle', label: 'Macro Battle', icon: <Swords size={17} />, badge: 'Signature' },
        { id: 'watchlist', label: 'Watchlist & Portfolios', icon: <Star size={17} /> },
      ],
    },
    {
      title: 'Asset Desks',
      items: [
        { id: 'forex', label: 'Forex Rankings', icon: <TrendingUp size={17} /> },
        { id: 'matrix', label: 'Currency Matrix', icon: <Grid3X3 size={17} /> },
        { id: 'cot_report', label: 'CFTC COT Report', icon: <FileSpreadsheet size={17} />, badge: 'CFTC' },
        { id: 'gold', label: 'Gold Macro Desk', icon: <Sparkles size={17} /> },
        { id: 'oil', label: 'Oil Macro Desk', icon: <Droplet size={17} /> },
        { id: 'indices', label: 'Equity Indices', icon: <BarChart2 size={17} /> },
      ],
    },
    {
      title: 'Intelligence Feeds',
      items: [
        { id: 'ai_copilot', label: 'AI & ML Copilot', icon: <Brain size={17} />, badge: 'AI' },
        { id: 'calendar', label: 'Macro Calendar', icon: <Calendar size={17} /> },
        { id: 'news', label: 'News Intelligence', icon: <Newspaper size={17} /> },
        { id: 'what_changed', label: 'What Changed', icon: <History size={17} />, badge: 'Delta' },
      ],
    },
    {
      title: 'Analytics & Validation',
      items: [
        { id: 'regime_scanner', label: 'Regime Scanner', icon: <ScanSearch size={17} />, badge: 'HOT' },
        { id: 'backtest', label: 'Backtesting Engine', icon: <Activity size={17} /> },
        { id: 'validation', label: 'Model Validation', icon: <FlaskConical size={17} />, badge: 'New' },
      ],
    },
    {
      title: 'System & Integrity',
      items: [
        { id: 'integrity', label: 'Data Integrity', icon: <DatabaseZap size={17} />, badge: 'New' },
        { id: 'health', label: 'System Health', icon: <ShieldCheck size={17} /> },
      ],
    },
  ];

  return (
    <aside
      style={{
        width: collapsed ? 64 : 224,
        background: 'var(--surface-1)',
        borderRight: '1px solid var(--border-subtle)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: collapsed ? '14px 6px' : '14px 10px',
        flexShrink: 0,
        height: '100%',
        minHeight: 0,
        overflowY: 'auto',
        transition: 'width 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* Collapse toggle row */}
        <div
          style={{
            display: 'flex',
            justifyContent: collapsed ? 'center' : 'space-between',
            alignItems: 'center',
            padding: '0 6px',
          }}
        >
          {!collapsed && (
            <span
              style={{
                fontSize: '0.75rem',
                fontWeight: 800,
                color: 'var(--text-dim)',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
              }}
            >
              Intelligence Rail
            </span>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-dim)',
              cursor: 'pointer',
              padding: 4,
              borderRadius: 4,
              display: 'flex',
              alignItems: 'center',
            }}
            title={collapsed ? 'Expand Rail' : 'Collapse Rail'}
          >
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>

        {/* Navigation Sections */}
        {sections.map((sec, sIdx) => (
          <div key={`sec-${sIdx}`} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {!collapsed && (
              <div
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  color: 'var(--text-dim)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  padding: '6px 8px 3px 8px',
                }}
              >
                {sec.title}
              </div>
            )}

            {sec.items.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onTabChange(item.id)}
                  title={collapsed ? item.label : undefined}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: collapsed ? 'center' : 'space-between',
                    padding: collapsed ? '9px 0' : '8px 10px',
                    borderRadius: 'var(--radius-sm)',
                    border: 'none',
                    background: isActive
                      ? 'linear-gradient(90deg, rgba(6, 182, 212, 0.18) 0%, rgba(6, 182, 212, 0.05) 100%)'
                      : 'transparent',
                    borderLeft: isActive ? '3px solid var(--accent-cyan)' : '3px solid transparent',
                    color: isActive ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                    fontSize: '0.8rem',
                    fontWeight: isActive ? 700 : 500,
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) e.currentTarget.style.background = 'var(--surface-2)';
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) e.currentTarget.style.background = 'transparent';
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                    <span style={{ color: isActive ? 'var(--accent-cyan)' : 'inherit' }}>
                      {item.icon}
                    </span>
                    {!collapsed && <span>{item.label}</span>}
                  </div>

                  {!collapsed && item.badge && (
                    <span
                      style={{
                        fontSize: '0.75rem',
                        fontWeight: 800,
                        padding: '1px 5px',
                        borderRadius: 8,
                        background:
                          item.badge === 'Signature'
                            ? 'rgba(245, 158, 11, 0.2)'
                            : 'rgba(56, 189, 248, 0.2)',
                        color: item.badge === 'Signature' ? '#fbbf24' : '#38bdf8',
                      }}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {/* Rail Footer */}
      {!collapsed && (
        <div
          style={{
            padding: '10px 8px',
            borderTop: '1px solid var(--border-subtle)',
            fontSize: '0.75rem',
            color: 'var(--text-dim)',
            lineHeight: 1.4,
          }}
        >
          <div>Zero-Hallucination Core</div>
          <div style={{ color: '#10b981', fontWeight: 600, marginTop: 2 }}>● Engines Synchronized</div>
          <div style={{ marginTop: 6, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            © {new Date().getFullYear()} Fortune Anukposi
          </div>
        </div>
      )}
    </aside>
  );
};
