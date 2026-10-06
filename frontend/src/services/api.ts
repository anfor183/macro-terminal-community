import {
  AssetItem,
  AssetDetail,
  MacroRegime,
  CurrencyMatrixItem,
  ForexRankingItem,
  GoldDashboard,
  OilDashboard,
  CalendarEvent,
  WhatChangedItem,
  AlertItem,
  SystemHealthData,
  LiveStatus,
  Historical15YReport,
  Historical15YSummaryItem,
  COTPositionSnapshot,
  TraderConfluenceCard,
  RegimeSignalsResponse,
  RegimeSignalAssetResponse,
  RegimeSignalBacktest,
  ForwardTestLogResponse,
  HistoricalSignalsResponse,
  MLModelStatus,
  DynamicWeightsResponse,
  MLPredictionResponse,
  CopilotResponse,
  RAGSearchResponse,
  NLPSentimentAnalysis,
  LegacyCOTReportResponse,
  LegacyCOTChartHistory,
  COTIndexChartResponse,
  COTIndexMarketsResponse,
  COTWeeklyBreakdownResponse,
} from '../types/macro';


const API_BASE = '/api/v1';

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, options);
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`API Error ${res.status}: ${errText}`);
  }
  return res.json();
}

export const api = {
  getRegime: () => fetchJson<MacroRegime>(`${API_BASE}/macro/regime`),

  getAssets: (assetClass?: string, search?: string) => {
    const params = new URLSearchParams();
    if (assetClass) params.set('asset_class', assetClass);
    if (search) params.set('search', search);
    const qs = params.toString();
    return fetchJson<AssetItem[]>(`${API_BASE}/assets${qs ? `?${qs}` : ''}`);
  },

  getAssetDetail: (symbol: string) =>
    fetchJson<AssetDetail>(`${API_BASE}/assets/${encodeURIComponent(symbol)}`),

  getAssetHistory: (symbol: string) =>
    fetchJson<Array<{ timestamp: string; score: number; weekly_score: number; tactical_bias: string; confidence: number }>>(
      `${API_BASE}/assets/${encodeURIComponent(symbol)}/history`
    ),

  getCurrencyMatrix: () => fetchJson<CurrencyMatrixItem[]>(`${API_BASE}/currencies/matrix`),

  getCurrencyRanking: () =>
    fetchJson<Array<{ rank: number; code: string; name: string; score: number; weekly_score: number; policy_direction: string; growth_direction: string }>>(
      `${API_BASE}/currencies/ranking`
    ),

  getForexRankings: () => fetchJson<ForexRankingItem[]>(`${API_BASE}/forex/rankings`),

  getGoldDashboard: () => fetchJson<GoldDashboard>(`${API_BASE}/specialized/gold`),

  getOilDashboard: () => fetchJson<OilDashboard>(`${API_BASE}/specialized/oil`),

  getCalendar: () => fetchJson<CalendarEvent[]>(`${API_BASE}/calendar`),

  getNews: (category?: string, tier?: number) => {
    const params = new URLSearchParams();
    if (category) params.set('category', category);
    if (tier) params.set('tier', tier.toString());
    const qs = params.toString();
    return fetchJson<any[]>(`${API_BASE}/news${qs ? `?${qs}` : ''}`);
  },

  getInstitutional: () => fetchJson<any[]>(`${API_BASE}/institutional`),

  getWhatChanged: () => fetchJson<WhatChangedItem[]>(`${API_BASE}/what-changed`),

  getAlerts: () => fetchJson<AlertItem[]>(`${API_BASE}/alerts`),

  runSimulation: (scenarioId: string) =>
    fetchJson<{ status: string; message: string; scenario_executed: string }>(
      `${API_BASE}/simulation/run?scenario_id=${encodeURIComponent(scenarioId)}`,
      { method: 'POST' }
    ),

  getBacktest: (symbol: string, holdingDays: number = 5) =>
    fetchJson<{ metrics: any; calibrations: any[] }>(
      `${API_BASE}/backtest?symbol=${encodeURIComponent(symbol)}&holding_days=${holdingDays}`
    ),

  getSystemHealth: () => fetchJson<SystemHealthData>(`${API_BASE}/system/health`),

  // Validation engine
  getValidationHistorical: (symbol: string, horizonDays = 5, totalWeeks = 52) =>
    fetchJson<any>(
      `${API_BASE}/validation/historical/${encodeURIComponent(symbol)}?horizon_days=${horizonDays}&total_weeks=${totalWeeks}`
    ),

  getValidationCalibration: (symbol: string, horizonDays = 5) =>
    fetchJson<any>(
      `${API_BASE}/validation/calibration/${encodeURIComponent(symbol)}?horizon_days=${horizonDays}`
    ),

  // Data integrity engine
  getIntegrityStatus: () => fetchJson<any>(`${API_BASE}/integrity/status`),

  getIntegrityIncidents: (severity?: string, limit = 50) => {
    const params = new URLSearchParams();
    if (severity) params.set('severity', severity);
    params.set('limit', limit.toString());
    return fetchJson<any>(`${API_BASE}/integrity/incidents?${params.toString()}`);
  },

  // Live ingestion engine (100% Free Public Feeds)
  getLiveStatus: () => fetchJson<LiveStatus>(`${API_BASE}/live/status`),
  triggerLiveSync: () =>
    fetchJson<{ message: string; details: any }>(`${API_BASE}/live/sync`, {
      method: 'POST',
    }),

  // 15-Year Historical & Forward Backtesting Engine (2011-2026)
  get15YBacktest: (symbol: string, horizonWeeks = 4) =>
    fetchJson<Historical15YReport>(
      `${API_BASE}/backtest/15y/${encodeURIComponent(symbol)}?horizon_weeks=${horizonWeeks}`
    ),

  get15YSummary: (horizonWeeks = 4) =>
    fetchJson<{
      horizon_weeks: number;
      evaluation_period: string;
      assets_count: number;
      summary: Historical15YSummaryItem[];
    }>(`${API_BASE}/backtest/15y-summary?horizon_weeks=${horizonWeeks}`),

  // CFTC COT Positioning & Trader Confluence
  getCOTPositioning: (symbol: string) =>
    fetchJson<COTPositionSnapshot>(`${API_BASE}/cot/${encodeURIComponent(symbol)}`),

  getAllCOTPositioning: () =>
    fetchJson<COTPositionSnapshot[]>(`${API_BASE}/cot-all`),

  getTraderConfluenceCard: (symbol: string) =>
    fetchJson<TraderConfluenceCard>(
      `${API_BASE}/bias/confluence/${encodeURIComponent(symbol)}`
    ),

  getPdfExportUrl: () => `${API_BASE}/export/pdf`,
  getCsvExportUrl: () => `${API_BASE}/export/csv`,

  // ── Regime Signal Scanner ──────────────────────────────────────────────────
  getRegimeSignals: (signalType?: string, strength?: string) => {
    const params = new URLSearchParams();
    if (signalType) params.set('signal_type', signalType);
    if (strength) params.set('strength', strength);
    const qs = params.toString();
    return fetchJson<RegimeSignalsResponse>(`${API_BASE}/regime-signals${qs ? `?${qs}` : ''}`);
  },

  getRegimeSignalsForAsset: (symbol: string) =>
    fetchJson<RegimeSignalAssetResponse>(
      `${API_BASE}/regime-signals/${encodeURIComponent(symbol)}`
    ),

  getRegimeSignalBacktest: (symbol: string, signalType = 'REVERSAL') =>
    fetchJson<RegimeSignalBacktest>(
      `${API_BASE}/regime-signals/backtest/${encodeURIComponent(symbol)}?signal_type=${signalType}`
    ),

  getForwardTestLog: () =>
    fetchJson<ForwardTestLogResponse>(`${API_BASE}/regime-signals/forward-test/log`),

  getHistoricalSignalLog: (params?: {
    symbol?: string;
    signal_type?: string;
    outcome?: string;
    horizon_weeks?: number;
    limit?: number;
  }) => {
    const sp = new URLSearchParams();
    if (params?.symbol) sp.set('symbol', params.symbol);
    if (params?.signal_type) sp.set('signal_type', params.signal_type);
    if (params?.outcome) sp.set('outcome', params.outcome);
    if (params?.horizon_weeks) sp.set('horizon_weeks', params.horizon_weeks.toString());
    if (params?.limit) sp.set('limit', params.limit.toString());
    const qs = sp.toString();
    return fetchJson<HistoricalSignalsResponse>(`${API_BASE}/regime-signals/history${qs ? `?${qs}` : ''}`);
  },

  // ── AI, Machine Learning, RAG & NLP Intelligence Hub ────────────────────────
  queryCopilot: (query: string, symbol?: string, macroRegime?: string) =>
    fetchJson<CopilotResponse>(`${API_BASE}/ai/copilot`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, symbol, macro_regime: macroRegime }),
    }),

  searchRAG: (query: string, topK = 5) =>
    fetchJson<RAGSearchResponse>(
      `${API_BASE}/ai/rag/search?query=${encodeURIComponent(query)}&top_k=${topK}`
    ),

  getMLStatus: () => fetchJson<MLModelStatus>(`${API_BASE}/ml/status`),

  getDynamicWeights: (assetClass: string, regime = 'EXPANSION') =>
    fetchJson<DynamicWeightsResponse>(
      `${API_BASE}/ml/weights/${encodeURIComponent(assetClass)}?regime=${encodeURIComponent(regime)}`
    ),

  predictMLConfluence: (payload: any) =>
    fetchJson<MLPredictionResponse>(`${API_BASE}/ml/predict`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }),

  analyzeNLP: (text: string, title?: string) =>
    fetchJson<NLPSentimentAnalysis>(`${API_BASE}/nlp/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, title }),
    }),

  // ── VPS Autonomous Resource Governor ─────────────────────────────────────────
  getVpsStatus: () => fetchJson<any>(`${API_BASE}/vps/status`),

  optimizeVps: () =>
    fetchJson<any>(`${API_BASE}/vps/optimize`, {
      method: 'POST',
    }),

  toggleVpsMode: (mode: string) =>
    fetchJson<any>(`${API_BASE}/vps/toggle-mode?mode=${encodeURIComponent(mode)}`, {
      method: 'POST',
    }),

  // Legacy Commitments of Traders (COT) Reports & Analytics
  getLegacyCOTReport: (params?: {
    category?: string;
    trader_group?: string;
    search?: string;
    detailed?: boolean;
  }) => {
    const sp = new URLSearchParams();
    if (params?.category) sp.set('category', params.category);
    if (params?.trader_group) sp.set('trader_group', params.trader_group);
    if (params?.search) sp.set('search', params.search);
    if (params?.detailed !== undefined) sp.set('detailed', params.detailed.toString());
    const qs = sp.toString();
    return fetchJson<LegacyCOTReportResponse>(`${API_BASE}/cot/legacy${qs ? `?${qs}` : ''}`);
  },

  getLegacyCOTChart: (symbol: string) =>
    fetchJson<LegacyCOTChartHistory>(`${API_BASE}/cot/legacy/chart/${encodeURIComponent(symbol)}`),

  getCOTIndexChart: (params?: {
    symbol?: string;
    timeframe?: string;
    trader_group?: string;
  }) => {
    const sp = new URLSearchParams();
    if (params?.symbol) sp.set('symbol', params.symbol);
    if (params?.timeframe) sp.set('timeframe', params.timeframe);
    if (params?.trader_group) sp.set('trader_group', params.trader_group);
    const qs = sp.toString();
    return fetchJson<COTIndexChartResponse>(`${API_BASE}/cot/index-chart${qs ? `?${qs}` : ''}`);
  },

  getCOTIndexMarkets: () =>
    fetchJson<COTIndexMarketsResponse>(`${API_BASE}/cot/index-markets`),

  getCOTBreakdown: (params: { symbol: string; timeframe?: string; sort?: string }) => {
    const sp = new URLSearchParams();
    sp.set('symbol', params.symbol);
    if (params.timeframe) sp.set('timeframe', params.timeframe);
    if (params.sort) sp.set('sort', params.sort);
    const qs = sp.toString();
    return fetchJson<COTWeeklyBreakdownResponse>(`${API_BASE}/cot/breakdown?${qs}`);
  },
};