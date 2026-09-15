import React, { useState, useEffect, useRef } from 'react';
import {
  Brain,
  Sparkles,
  Send,
  Search,
  Sliders,
  Activity,
  Layers,
  FileText,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  Scale,
  ShieldAlert,
  ArrowRight,
  Database,
  Cpu,
  RefreshCw,
  HelpCircle,
  BarChart3,
  Flame,
  AlertTriangle,
  Lightbulb,
  X,
  RotateCcw,
  ShieldCheck,
} from 'lucide-react';
import { api } from '../services/api';
import {
  MLModelStatus,
  DynamicWeightsResponse,
  CopilotResponse,
  RAGSearchResultItem,
  NLPSentimentAnalysis,
} from '../types/macro';

function renderFormattedSynthesis(text: string) {
  const paragraphs = text.split(/\n\n+/).filter(Boolean);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {paragraphs.map((para, i) => {
        const isMacroHeader = para.startsWith('**Macro Synthesis**:');
        const isPrecedentHeader = para.startsWith('**Historical Precedent');
        const isRiskHeader =
          para.startsWith('**Strategic Risk') || para.startsWith('**Key Trading');

        let title = '';
        let content = para;
        let badgeColor = '#818cf8';
        let badgeBg = 'rgba(99, 102, 241, 0.12)';
        let badgeBorder = 'rgba(99, 102, 241, 0.3)';
        let icon = <Lightbulb size={14} color="#818cf8" />;

        if (isMacroHeader) {
          title = 'Executive Macro Synthesis';
          content = para.replace(/^\*\*Macro Synthesis\*\*:\s*/, '');
          badgeColor = '#a855f7';
          badgeBg = 'rgba(168, 85, 247, 0.12)';
          badgeBorder = 'rgba(168, 85, 247, 0.3)';
          icon = <Brain size={14} color="#a855f7" />;
        } else if (isPrecedentHeader) {
          title = 'Historical Precedent & Central Bank Doctrine';
          content = para.replace(/^\*\*Historical Precedent & Doctrine\*\*:\s*/, '');
          badgeColor = '#10b981';
          badgeBg = 'rgba(16, 185, 129, 0.12)';
          badgeBorder = 'rgba(16, 185, 129, 0.3)';
          icon = <Database size={14} color="#10b981" />;
        } else if (isRiskHeader) {
          title = 'Strategic Trading & Risk Implications';
          content = para.replace(
            /^\*\*(?:Strategic Risk Implication|Key Trading & Risk Implications)\*\*:\s*/,
            ''
          );
          badgeColor = '#f59e0b';
          badgeBg = 'rgba(245, 158, 11, 0.12)';
          badgeBorder = 'rgba(245, 158, 11, 0.3)';
          icon = <AlertTriangle size={14} color="#f59e0b" />;
        }

        if (title) {
          return (
            <div
              key={i}
              style={{
                background: 'var(--surface-1)',
                border: `1px solid ${badgeBorder}`,
                borderRadius: 'var(--radius-md)',
                padding: '16px 18px',
              }}
            >
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  fontSize: '0.74rem',
                  fontWeight: 800,
                  color: badgeColor,
                  background: badgeBg,
                  padding: '3px 10px',
                  borderRadius: 999,
                  marginBottom: 10,
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                }}
              >
                {icon}
                <span>{title}</span>
              </div>
              <div
                style={{
                  fontSize: '0.88rem',
                  lineHeight: 1.7,
                  color: 'var(--text-primary)',
                }}
              >
                {content}
              </div>
            </div>
          );
        }

        return (
          <p
            key={i}
            style={{
              margin: 0,
              fontSize: '0.88rem',
              lineHeight: 1.7,
              color: 'var(--text-primary)',
            }}
          >
            {para}
          </p>
        );
      })}
    </div>
  );
}

export const AICopilotView: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'copilot' | 'ml_engine' | 'nlp_lab' | 'rag_archive'>('copilot');

  // ── Copilot State ──
  const [query, setQuery] = useState('');
  const [selectedAsset, setSelectedAsset] = useState('EURUSD');
  const [copilotLoading, setCopilotLoading] = useState(false);
  const [copilotResult, setCopilotResult] = useState<CopilotResponse | null>(null);
  const [copilotError, setCopilotError] = useState<string | null>(null);
  const responseRef = useRef<HTMLDivElement | null>(null);

  // ── ML Status & Dynamic Weights State ──
  const [mlStatus, setMlStatus] = useState<MLModelStatus | null>(null);
  const [selectedAssetClass, setSelectedAssetClass] = useState('forex');
  const [selectedRegime, setSelectedRegime] = useState('INFLATIONARY');
  const [dynamicWeights, setDynamicWeights] = useState<DynamicWeightsResponse | null>(null);
  const [mlLoading, setMlLoading] = useState(false);

  // ── NLP Lab State ──
  const [nlpInput, setNlpInput] = useState(
    'Fed Chair Powell strongly signals restrictive policy will remain higher for longer to combat stubborn inflation persistence.'
  );
  const [nlpResult, setNlpResult] = useState<NLPSentimentAnalysis | null>(null);
  const [nlpLoading, setNlpLoading] = useState(false);

  // ── RAG Search State ──
  const [ragQuery, setRagQuery] = useState('carry trade unwind yen boj');
  const [ragResults, setRagResults] = useState<RAGSearchResultItem[]>([]);
  const [ragLoading, setRagLoading] = useState(false);

  // Suggested Prompts
  const PRESET_QUERIES = [
    'How does a 50bp Fed rate cut impact Gold and the US Dollar?',
    'What happens when the Bank of Japan ends negative rates and carry trades unwind?',
    'Compare current 2026 easing cycle to the 2013 Taper Tantrum playbook.',
    'Analyze EUR/USD fundamental sensitivity if ECB cuts faster than the Fed.',
  ];

  // Load initial data
  useEffect(() => {
    loadMLStatus();
    loadDynamicWeights('forex', 'INFLATIONARY');
    handleRunNLP(nlpInput);
    handleSearchRAG(ragQuery);
  }, []);

  const loadMLStatus = async () => {
    try {
      const data = await api.getMLStatus();
      setMlStatus(data);
    } catch (err) {
      console.error('Failed to load ML status', err);
    }
  };

  const loadDynamicWeights = async (assetClass: string, regime: string) => {
    setMlLoading(true);
    try {
      const data = await api.getDynamicWeights(assetClass, regime);
      setDynamicWeights(data);
    } catch (err) {
      console.error('Failed to load dynamic weights', err);
    } finally {
      setMlLoading(false);
    }
  };

  const handleAskCopilot = async (qText?: string) => {
    const textToSend = qText || query;
    if (!textToSend.trim()) return;
    setCopilotLoading(true);
    setCopilotError(null);

    // Smooth scroll down to response area
    setTimeout(() => {
      responseRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 80);

    try {
      const res = await api.queryCopilot(textToSend, selectedAsset);
      setCopilotResult(res);
      setTimeout(() => {
        responseRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 120);
    } catch (err: any) {
      console.error('Copilot query error', err);
      setCopilotError(
        err?.message || 'Failed to complete macroeconomic synthesis. Please verify backend connection and try again.'
      );
    } finally {
      setCopilotLoading(false);
    }
  };

  const handleRunNLP = async (text: string) => {
    if (!text.trim()) return;
    setNlpLoading(true);
    try {
      const res = await api.analyzeNLP(text);
      setNlpResult(res);
    } catch (err) {
      console.error('NLP analysis error', err);
    } finally {
      setNlpLoading(false);
    }
  };

  const handleSearchRAG = async (searchQ: string) => {
    if (!searchQ.trim()) return;
    setRagLoading(true);
    try {
      const res = await api.searchRAG(searchQ, 6);
      setRagResults(res.results || []);
    } catch (err) {
      console.error('RAG search error', err);
    } finally {
      setRagLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, paddingBottom: 40 }}>
      {/* ── Header ── */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 16,
          background: 'var(--surface-elevated)',
          padding: '20px 24px',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-subtle)',
          boxShadow: 'var(--shadow-md)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 'var(--radius-md)',
              background: 'linear-gradient(135deg, rgba(99,102,241,0.25), rgba(168,85,247,0.3))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid rgba(168,85,247,0.4)',
              color: '#c084fc',
            }}
          >
            <Brain size={24} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <h1 style={{ fontSize: '1.4rem', fontWeight: 900, margin: 0, color: 'var(--text-primary)' }}>
                AI & Machine Learning Intelligence Hub
              </h1>
              <span
                style={{
                  background: 'linear-gradient(135deg, #6366f1, #a855f7)',
                  color: '#fff',
                  fontSize: '0.75rem',
                  fontWeight: 800,
                  padding: '2px 8px',
                  borderRadius: 999,
                  letterSpacing: '0.06em',
                }}
              >
                PRO GRADE
              </span>
            </div>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              Generative AI Macro Strategist (Google Gemini) • Institutional Financial NLP • XGBoost Dynamic Factor Weights • Central Bank Vector RAG
            </p>
          </div>
        </div>

        {/* Sub-tab Switcher */}
        <div
          style={{
            display: 'flex',
            background: 'var(--surface-1)',
            padding: 4,
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-subtle)',
            gap: 4,
            flexWrap: 'wrap',
          }}
        >
          {[
            { id: 'copilot', label: 'Macro Copilot', icon: <Sparkles size={14} /> },
            { id: 'ml_engine', label: 'ML Model & Dynamic Weights', icon: <Cpu size={14} /> },
            { id: 'nlp_lab', label: 'Financial NLP Lab', icon: <Activity size={14} /> },
            { id: 'rag_archive', label: 'Central Bank RAG Store', icon: <Database size={14} /> },
          ].map((tab) => {
            const isActive = activeSubTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveSubTab(tab.id as any)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 7,
                  padding: '8px 16px',
                  fontSize: '0.82rem',
                  fontWeight: isActive ? 700 : 600,
                  color: isActive ? '#ffffff' : 'var(--text-secondary)',
                  background: isActive
                    ? 'linear-gradient(135deg, #6366f1, #a855f7)'
                    : 'transparent',
                  borderRadius: 'var(--radius-sm)',
                  border: 'none',
                  cursor: 'pointer',
                  boxShadow: isActive ? '0 2px 8px rgba(99, 102, 241, 0.35)' : 'none',
                  transition: 'all 0.15s ease',
                }}
              >
                {tab.icon}
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── TAB 1: Macro Copilot ── */}
      {activeSubTab === 'copilot' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Query Input Box */}
          <div
            style={{
              background: 'var(--surface-elevated)',
              padding: 22,
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border-subtle)',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <Sparkles size={18} color="#a855f7" />
                <span style={{ fontSize: '0.94rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                  Ask Macro Copilot
                </span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  (Reasoning grounded in verified central bank transcripts & macroeconomic data)
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                <span
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: '50%',
                    background: '#10b981',
                    boxShadow: '0 0 8px #10b981',
                    display: 'inline-block',
                  }}
                />
                <span>Zero-Hallucination Vector RAG Active</span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
              {/* Asset Context Dropdown */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                  Asset:
                </span>
                <select
                  value={selectedAsset}
                  onChange={(e) => setSelectedAsset(e.target.value)}
                  style={{
                    padding: '10px 12px',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--surface-1)',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-primary)',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    outline: 'none',
                    cursor: 'pointer',
                  }}
                >
                  <option value="EURUSD">EUR/USD (Euro)</option>
                  <option value="USDJPY">USD/JPY (Yen)</option>
                  <option value="GBPUSD">GBP/USD (Pound)</option>
                  <option value="AUDUSD">AUD/USD (Aussie)</option>
                  <option value="USDCAD">USD/CAD (Loonie)</option>
                  <option value="USDCHF">USD/CHF (Swiss Franc)</option>
                  <option value="XAUUSD">XAU/USD (Spot Gold)</option>
                  <option value="USOIL">WTI Crude Oil</option>
                  <option value="SPX">S&P 500 Index</option>
                  <option value="BTCUSD">Bitcoin / USD</option>
                  <option value="ETHUSD">Ethereum / USD</option>
                </select>
              </div>

              {/* Main Prompt Input */}
              <div style={{ flex: 1, position: 'relative', minWidth: 260 }}>
                <input
                  type="text"
                  placeholder="Ask any macroeconomic or monetary policy scenario (e.g. 'What is the Gold sensitivity to real yields?')..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAskCopilot()}
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    padding: '12px 38px 12px 16px',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--surface-1)',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-primary)',
                    fontSize: '0.88rem',
                    outline: 'none',
                  }}
                />
                {query && (
                  <button
                    onClick={() => setQuery('')}
                    title="Clear prompt"
                    style={{
                      position: 'absolute',
                      right: 12,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--text-muted)',
                      cursor: 'pointer',
                      padding: 2,
                    }}
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              {/* Synthesize Button */}
              <button
                id="btn-synthesize-copilot"
                onClick={() => handleAskCopilot()}
                disabled={copilotLoading || !query.trim()}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '0 24px',
                  borderRadius: 'var(--radius-md)',
                  background: copilotLoading
                    ? 'linear-gradient(135deg, #6366f1, #a855f7)'
                    : !query.trim()
                    ? 'var(--surface-2)'
                    : 'linear-gradient(135deg, #6366f1, #a855f7)',
                  color: !query.trim() && !copilotLoading ? 'var(--text-muted)' : '#ffffff',
                  fontWeight: 700,
                  fontSize: '0.86rem',
                  border: !query.trim() && !copilotLoading ? '1px solid var(--border-subtle)' : 'none',
                  cursor: copilotLoading || !query.trim() ? 'not-allowed' : 'pointer',
                  boxShadow: query.trim() && !copilotLoading ? '0 2px 12px rgba(168, 85, 247, 0.35)' : 'none',
                  transition: 'all 0.15s ease',
                  minHeight: 44,
                }}
              >
                {copilotLoading ? (
                  <RefreshCw size={16} className="animate-spin" />
                ) : (
                  <Send size={16} />
                )}
                <span>{copilotLoading ? 'Synthesizing…' : 'Synthesize'}</span>
              </button>
            </div>

            {/* Quick Prompt Presets */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                Quick Scenarios:
              </span>
              {PRESET_QUERIES.map((preset, idx) => {
                const isSelected = query === preset;
                return (
                  <button
                    key={idx}
                    onClick={() => {
                      setQuery(preset);
                      handleAskCopilot(preset);
                    }}
                    style={{
                      background: isSelected ? 'rgba(168, 85, 247, 0.15)' : 'var(--surface-1)',
                      border: `1px solid ${isSelected ? 'rgba(168, 85, 247, 0.45)' : 'var(--border-subtle)'}`,
                      borderRadius: 999,
                      padding: '5px 14px',
                      fontSize: '0.76rem',
                      fontWeight: isSelected ? 700 : 500,
                      color: isSelected ? '#a855f7' : 'var(--text-secondary)',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {preset}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Response Container (with ref for smooth auto-scrolling) */}
          <div ref={responseRef} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* 1. Loading In-Flight Skeleton */}
            {copilotLoading && (
              <div
                style={{
                  background: 'var(--surface-elevated)',
                  borderRadius: 'var(--radius-lg)',
                  border: '1px solid rgba(168, 85, 247, 0.4)',
                  padding: 32,
                  boxShadow: '0 0 24px rgba(168, 85, 247, 0.12)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 16,
                }}
              >
                <div style={{ position: 'relative' }}>
                  <Brain size={40} color="#a855f7" className="animate-spin" />
                </div>
                <div style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                  Synthesizing Macro Reasoning & Institutional RAG...
                </div>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', textAlign: 'center', maxWidth: 500, lineHeight: 1.5 }}>
                  Querying vector database for historical central bank precedents, policy rate differentials, and cross-asset transmission mechanics.
                </div>
                <div style={{ width: 220, height: 4, background: 'var(--surface-2)', borderRadius: 999, overflow: 'hidden' }}>
                  <div
                    style={{
                      width: '100%',
                      height: '100%',
                      background: 'linear-gradient(90deg, #6366f1, #a855f7, #6366f1)',
                      backgroundSize: '200% 100%',
                      animation: 'shimmer 1.4s infinite linear',
                    }}
                  />
                </div>
              </div>
            )}

            {/* 2. Error Banner */}
            {copilotError && !copilotLoading && (
              <div
                style={{
                  background: 'rgba(239, 68, 68, 0.08)',
                  borderRadius: 'var(--radius-lg)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  padding: 20,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: 16,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <AlertTriangle size={22} color="#f43f5e" style={{ flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#f43f5e' }}>
                      Synthesis Error
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 2 }}>
                      {copilotError}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => handleAskCopilot()}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '8px 16px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'rgba(239, 68, 68, 0.15)',
                    border: '1px solid rgba(239, 68, 68, 0.4)',
                    color: '#f43f5e',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  <RotateCcw size={14} />
                  Retry
                </button>
              </div>
            )}

            {/* 3. Successful Copilot Response Card */}
            {copilotResult && !copilotLoading && (
              <div
                style={{
                  background: 'var(--surface-elevated)',
                  borderRadius: 'var(--radius-lg)',
                  border: '1px solid var(--border-subtle)',
                  padding: 24,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 20,
                  boxShadow: 'var(--shadow-md)',
                }}
              >
                {/* Response Header */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: 12,
                    borderBottom: '1px solid var(--border-subtle)',
                    paddingBottom: 14,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div
                      style={{
                        width: 34,
                        height: 34,
                        borderRadius: 8,
                        background: 'rgba(168, 85, 247, 0.15)',
                        border: '1px solid rgba(168, 85, 247, 0.3)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#c084fc',
                      }}
                    >
                      <Brain size={18} />
                    </div>
                    <div>
                      <span style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                        Executive Macro Synthesis
                      </span>
                      <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                        Query: &ldquo;{copilotResult.query}&rdquo;
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span
                      style={{
                        fontSize: '0.74rem',
                        fontWeight: 700,
                        padding: '3px 10px',
                        borderRadius: 999,
                        background: 'rgba(99, 102, 241, 0.12)',
                        color: '#818cf8',
                        border: '1px solid rgba(99, 102, 241, 0.28)',
                      }}
                    >
                      {copilotResult.provider}
                    </span>
                    <span className="mono" style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                      {new Date(copilotResult.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                </div>

                {/* Formatted Sections */}
                {renderFormattedSynthesis(copilotResult.response)}

                {/* Citations & Verified Precedents */}
                {copilotResult.citations && copilotResult.citations.length > 0 && (
                  <div
                    style={{
                      background: 'var(--surface-1)',
                      borderRadius: 'var(--radius-md)',
                      padding: 18,
                      border: '1px solid var(--border-subtle)',
                    }}
                  >
                    <div
                      style={{
                        fontSize: '0.8rem',
                        fontWeight: 800,
                        color: 'var(--text-secondary)',
                        marginBottom: 12,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                      }}
                    >
                      <Database size={15} color="#38bdf8" />
                      Verified Central Bank RAG Precedents ({copilotResult.citations.length})
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
                      {copilotResult.citations.map((c) => (
                        <div
                          key={c.id}
                          style={{
                            background: 'var(--surface-elevated)',
                            padding: 14,
                            borderRadius: 'var(--radius-sm)',
                            border: '1px solid var(--border-subtle)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 6,
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                            <span style={{ fontWeight: 700, fontSize: '0.8rem', color: 'var(--text-primary)' }}>
                              {c.title}
                            </span>
                            <span
                              style={{
                                fontSize: '0.72rem',
                                color: '#10b981',
                                fontWeight: 700,
                                background: 'rgba(16, 185, 129, 0.12)',
                                padding: '1px 6px',
                                borderRadius: 4,
                                flexShrink: 0,
                              }}
                            >
                              {(c.relevance_score * 100).toFixed(0)}% match
                            </span>
                          </div>
                          <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                            <span style={{ fontWeight: 600, color: 'var(--accent-cyan)' }}>{c.institution}</span> • {c.date}
                          </div>
                          <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                            {c.takeaway}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 4. Starter Interactive Guidance (when idle with no result yet) */}
            {!copilotLoading && !copilotResult && !copilotError && (
              <div
                style={{
                  background: 'var(--surface-elevated)',
                  borderRadius: 'var(--radius-lg)',
                  border: '1px dashed var(--border-subtle)',
                  padding: 32,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  textAlign: 'center',
                  gap: 14,
                }}
              >
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: '50%',
                    background: 'rgba(168, 85, 247, 0.12)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#c084fc',
                  }}
                >
                  <Sparkles size={24} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                    Ready for Institutional Macro Reasoning
                  </h3>
                  <p style={{ margin: '6px 0 0', fontSize: '0.82rem', color: 'var(--text-muted)', maxWidth: 480 }}>
                    Enter any monetary policy scenario or click one of the quick scenario pills above to generate a grounded executive briefing backed by verified central bank transcripts.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── TAB 2: ML Model Intelligence & Dynamic Factor Weights ── */}
      {activeSubTab === 'ml_engine' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* ML Performance KPI Banner */}
          {mlStatus && (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: 14,
              }}
            >
              {[
                {
                  label: 'ML Architecture',
                  value: 'XGBoost Multi-Class',
                  sub: '15-Year Calibrated Walk-Forward',
                  color: '#818cf8',
                },
                {
                  label: 'Directional Hit Rate',
                  value: `${(mlStatus.validation_accuracy * 100).toFixed(1)}%`,
                  sub: 'Historical Validation Accuracy',
                  color: '#34d399',
                },
                {
                  label: 'Macro F1-Score',
                  value: mlStatus.f1_macro_score.toFixed(3),
                  sub: 'Balanced Multi-Class Precision',
                  color: '#38bdf8',
                },
                {
                  label: 'Features Monitored',
                  value: `${mlStatus.features_monitored} Factors`,
                  sub: 'Yields, Spreads, COT, ATR, Risk',
                  color: '#fbbf24',
                },
              ].map((kpi, idx) => (
                <div
                  key={idx}
                  style={{
                    background: 'var(--surface-elevated)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-lg)',
                    padding: 16,
                  }}
                >
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 4 }}>
                    {kpi.label}
                  </div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 900, color: kpi.color, marginBottom: 4 }}>
                    {kpi.value}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    {kpi.sub}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Two-Column Layout: Feature Importances vs Dynamic Weight Optimizer */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            {/* Left: Top Feature Importances */}
            <div
              style={{
                background: 'var(--surface-elevated)',
                padding: 22,
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                <BarChart3 size={18} color="#818cf8" />
                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                  XGBoost Feature Importance Attribution
                </h3>
              </div>
              <p style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginBottom: 16 }}>
                Normalized SHAP-style weights showing the relative predictive contribution of each macroeconomic variable.
              </p>

              {mlStatus && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {mlStatus.top_features_by_importance.map((f, i) => (
                    <div key={i}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: 4 }}>
                        <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                          {f.feature.replace(/_/g, ' ').toUpperCase()}
                        </span>
                        <span style={{ fontWeight: 700, color: '#818cf8' }}>
                          {(f.weight * 100).toFixed(1)}%
                        </span>
                      </div>
                      <div style={{ width: '100%', height: 7, background: 'var(--surface-1)', borderRadius: 999, overflow: 'hidden' }}>
                        <div
                          style={{
                            width: `${Math.min(100, f.weight * 280)}%`,
                            height: '100%',
                            background: 'linear-gradient(90deg, #6366f1, #a855f7)',
                            borderRadius: 999,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Right: Dynamic Weights vs Static Defaults */}
            <div
              style={{
                background: 'var(--surface-elevated)',
                padding: 22,
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Sliders size={18} color="#34d399" />
                  <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                    Regime-Adaptive Dynamic Factor Weights
                  </h3>
                </div>
              </div>

              {/* Controls */}
              <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
                <select
                  value={selectedAssetClass}
                  onChange={(e) => {
                    setSelectedAssetClass(e.target.value);
                    loadDynamicWeights(e.target.value, selectedRegime);
                  }}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'var(--surface-1)',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-primary)',
                    fontSize: '0.78rem',
                  }}
                >
                  <option value="forex">Forex Majors</option>
                  <option value="metal">Precious Metals (Gold/Silver)</option>
                  <option value="commodity">Commodities (Crude Oil)</option>
                  <option value="index">Equity Indices (S&P / Nasdaq)</option>
                  <option value="crypto">Crypto (BTC / ETH)</option>
                </select>

                <select
                  value={selectedRegime}
                  onChange={(e) => {
                    setSelectedRegime(e.target.value);
                    loadDynamicWeights(selectedAssetClass, e.target.value);
                  }}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'var(--surface-1)',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-primary)',
                    fontSize: '0.78rem',
                  }}
                >
                  <option value="INFLATIONARY">High Inflation Regime</option>
                  <option value="EXPANSION">Growth Expansion Regime</option>
                  <option value="SLOWDOWN">Contraction / Recession Regime</option>
                  <option value="RISK_OFF">Crisis / Risk-Off Liquidity Shock</option>
                </select>
              </div>

              {/* Weights Table */}
              {dynamicWeights && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 320, overflowY: 'auto' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1.8fr 1fr 1fr 1fr', fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', paddingBottom: 6, borderBottom: '1px solid var(--border-subtle)' }}>
                    <span>FACTOR</span>
                    <span style={{ textAlign: 'right' }}>STATIC</span>
                    <span style={{ textAlign: 'right' }}>DYNAMIC</span>
                    <span style={{ textAlign: 'right' }}>DELTA</span>
                  </div>

                  {Object.keys(dynamicWeights.dynamic_weights).map((factorKey) => {
                    const staticVal = dynamicWeights.static_weights[factorKey] || 0.1;
                    const dynamicVal = dynamicWeights.dynamic_weights[factorKey];
                    const delta = dynamicVal - staticVal;
                    return (
                      <div
                        key={factorKey}
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '1.8fr 1fr 1fr 1fr',
                          fontSize: '0.76rem',
                          alignItems: 'center',
                          padding: '6px 0',
                          borderBottom: '1px solid rgba(255,255,255,0.04)',
                        }}
                      >
                        <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                          {factorKey.replace(/_/g, ' ').toUpperCase()}
                        </span>
                        <span style={{ textAlign: 'right', color: 'var(--text-muted)' }}>
                          {(staticVal * 100).toFixed(1)}%
                        </span>
                        <span style={{ textAlign: 'right', fontWeight: 700, color: '#34d399' }}>
                          {(dynamicVal * 100).toFixed(1)}%
                        </span>
                        <span
                          style={{
                            textAlign: 'right',
                            fontWeight: 700,
                            color: delta > 0.005 ? '#34d399' : delta < -0.005 ? '#f87171' : 'var(--text-muted)',
                          }}
                        >
                          {delta > 0 ? `+${(delta * 100).toFixed(1)}%` : `${(delta * 100).toFixed(1)}%`}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 3: Financial NLP Sentiment Lab ── */}
      {activeSubTab === 'nlp_lab' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div
            style={{
              background: 'var(--surface-elevated)',
              padding: 22,
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <Activity size={18} color="#38bdf8" />
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                Institutional Financial NLP Sentiment Analyzer
              </h3>
            </div>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 16 }}>
              Evaluates text against the Loughran-McDonald financial dictionary and central bank hawkish/dovish policy polarity with contextual negation handling.
            </p>

            <textarea
              rows={3}
              value={nlpInput}
              onChange={(e) => setNlpInput(e.target.value)}
              placeholder="Paste any central bank speech excerpt, economic news wire, or market headline..."
              style={{
                width: '100%',
                padding: '12px 16px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--surface-1)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-primary)',
                fontSize: '0.84rem',
                outline: 'none',
                resize: 'none',
                boxSizing: 'border-box',
                marginBottom: 12,
              }}
            />

            <button
              onClick={() => handleRunNLP(nlpInput)}
              disabled={nlpLoading}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 18px',
                borderRadius: 'var(--radius-sm)',
                background: 'linear-gradient(135deg, #6366f1, #a855f7)',
                color: '#fff',
                fontWeight: 700,
                fontSize: '0.82rem',
                border: 'none',
                cursor: nlpLoading ? 'not-allowed' : 'pointer',
                boxShadow: '0 2px 8px rgba(99, 102, 241, 0.3)',
              }}
            >
              {nlpLoading ? <RefreshCw size={14} className="animate-spin" /> : <Activity size={14} />}
              Run Multi-Dimensional NLP Analysis
            </button>
          </div>

          {/* NLP Analysis Result */}
          {nlpResult && (
            <div
              style={{
                background: 'var(--surface-elevated)',
                padding: 22,
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--border-subtle)',
                display: 'flex',
                flexDirection: 'column',
                gap: 16,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-subtle)', paddingBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: '0.92rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                    Classification:
                  </span>
                  <span
                    style={{
                      fontSize: '0.75rem',
                      fontWeight: 800,
                      padding: '3px 10px',
                      borderRadius: 999,
                      background: nlpResult.statement_type === 'HARD_DATA' ? 'rgba(52,211,153,0.15)' : 'rgba(99,102,241,0.15)',
                      color: nlpResult.statement_type === 'HARD_DATA' ? '#34d399' : '#818cf8',
                    }}
                  >
                    {nlpResult.statement_type.replace(/_/g, ' ')}
                  </span>
                  <span
                    style={{
                      fontSize: '0.75rem',
                      fontWeight: 800,
                      padding: '3px 10px',
                      borderRadius: 999,
                      background: nlpResult.direction === 'BULLISH' ? 'rgba(52,211,153,0.15)' : nlpResult.direction === 'BEARISH' ? 'rgba(248,113,113,0.15)' : 'rgba(255,255,255,0.08)',
                      color: nlpResult.direction === 'BULLISH' ? '#34d399' : nlpResult.direction === 'BEARISH' ? '#f87171' : 'var(--text-muted)',
                    }}
                  >
                    {nlpResult.direction}
                  </span>
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  NLP Confidence: <strong style={{ color: 'var(--text-primary)' }}>{nlpResult.confidence}%</strong>
                </div>
              </div>

              {/* Dimensional Polarities */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
                <div style={{ background: 'var(--surface-1)', padding: 16, borderRadius: 'var(--radius-md)' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 4 }}>
                    Monetary Stance (Hawkish / Dovish)
                  </div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 900, color: nlpResult.hawkish_dovish_score > 0 ? '#f87171' : '#34d399' }}>
                    {nlpResult.hawkish_dovish_score > 0 ? `+${nlpResult.hawkish_dovish_score}` : nlpResult.hawkish_dovish_score}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    {nlpResult.hawkish_dovish_score > 15 ? 'Hawkish / Restrictive Policy' : nlpResult.hawkish_dovish_score < -15 ? 'Dovish / Accommodative Easing' : 'Balanced Policy Neutral'}
                  </div>
                </div>

                <div style={{ background: 'var(--surface-1)', padding: 16, borderRadius: 'var(--radius-md)' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 4 }}>
                    Growth Sentiment Impulse
                  </div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 900, color: nlpResult.growth_sentiment >= 0 ? '#34d399' : '#f87171' }}>
                    {nlpResult.growth_sentiment > 0 ? `+${nlpResult.growth_sentiment}` : nlpResult.growth_sentiment}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    {nlpResult.growth_sentiment > 15 ? 'Economic Expansion & Beat' : nlpResult.growth_sentiment < -15 ? 'Contraction & Recession Risk' : 'Baseline Trend'}
                  </div>
                </div>

                <div style={{ background: 'var(--surface-1)', padding: 16, borderRadius: 'var(--radius-md)' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 4 }}>
                    Inflation Pressure Index
                  </div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 900, color: nlpResult.inflation_pressure > 0 ? '#fbbf24' : '#38bdf8' }}>
                    {nlpResult.inflation_pressure > 0 ? `+${nlpResult.inflation_pressure}` : nlpResult.inflation_pressure}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    {nlpResult.inflation_pressure > 15 ? 'Accelerating Price Pressures' : nlpResult.inflation_pressure < -15 ? 'Disinflationary Cooling' : 'Anchor at Target'}
                  </div>
                </div>
              </div>

              {/* Detected Entities */}
              {nlpResult.detected_currencies.length > 0 && (
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Detected Entities:</span>
                  {nlpResult.detected_currencies.map((c) => (
                    <span
                      key={c}
                      style={{
                        background: 'var(--surface-1)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: 4,
                        padding: '2px 8px',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        color: 'var(--text-primary)',
                      }}
                    >
                      {c}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── TAB 4: Central Bank RAG Store ── */}
      {activeSubTab === 'rag_archive' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div
            style={{
              background: 'var(--surface-elevated)',
              padding: 22,
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <Database size={18} color="#34d399" />
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                Central Bank Transcript & Crisis Playbook Vector Store
              </h3>
            </div>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 16 }}>
              Vectorized repository of FOMC, ECB, BoE, and BoJ transcripts, rate hiking cycles, carry trade unwinds, and crisis playbooks.
            </p>

            <div style={{ display: 'flex', gap: 10 }}>
              <input
                type="text"
                value={ragQuery}
                onChange={(e) => setRagQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearchRAG(ragQuery)}
                placeholder="Search statements (e.g. '50bp rate cut', 'Taper Tantrum', 'SVB banking stress')..."
                style={{
                  flex: 1,
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--surface-1)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-primary)',
                  fontSize: '0.84rem',
                  outline: 'none',
                }}
              />
              <button
                onClick={() => handleSearchRAG(ragQuery)}
                disabled={ragLoading}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '0 18px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'linear-gradient(135deg, #6366f1, #a855f7)',
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: '0.82rem',
                  border: 'none',
                  cursor: ragLoading ? 'not-allowed' : 'pointer',
                  boxShadow: '0 2px 8px rgba(99, 102, 241, 0.3)',
                }}
              >
                {ragLoading ? <RefreshCw size={14} className="animate-spin" /> : <Search size={14} />}
                Search
              </button>
            </div>
          </div>

          {/* Results Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16 }}>
            {ragResults.map((r) => (
              <div
                key={r.id}
                style={{
                  background: 'var(--surface-elevated)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-lg)',
                  padding: 18,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <span
                    style={{
                      fontSize: '0.75rem',
                      fontWeight: 800,
                      padding: '2px 8px',
                      borderRadius: 4,
                      background: 'rgba(56,189,248,0.15)',
                      color: '#38bdf8',
                    }}
                  >
                    {r.institution} • {r.category.replace(/_/g, ' ')}
                  </span>
                  <span style={{ fontSize: '0.75rem', color: '#34d399', fontWeight: 700 }}>
                    {(r.relevance_score * 100).toFixed(0)}% match
                  </span>
                </div>

                <h4 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                  {r.title}
                </h4>

                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Date: {r.date}
                </div>

                <p style={{ fontSize: '0.78rem', lineHeight: 1.5, color: 'var(--text-secondary)', margin: 0 }}>
                  "{r.content}"
                </p>

                <div style={{ background: 'var(--surface-1)', padding: 10, borderRadius: 'var(--radius-sm)', fontSize: '0.75rem' }}>
                  <strong style={{ color: '#c084fc' }}>Takeaway:</strong> {r.key_takeaway}
                </div>

                <div style={{ fontSize: '0.75rem', color: '#fbbf24' }}>
                  <strong>Market Impact:</strong> {r.historical_asset_reaction}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
