export type BiasCategory =
  | 'STRONG BULLISH'
  | 'BULLISH'
  | 'MILD BULLISH'
  | 'NEUTRAL'
  | 'MILD BEARISH'
  | 'BEARISH'
  | 'STRONG BEARISH';

export interface AssetItem {
  id: number;
  symbol: string;
  name: string;
  asset_class: 'forex' | 'index' | 'metal' | 'commodity' | 'crypto';
  base_currency?: string;
  quote_currency?: string;
  current_price: number;
  daily_change_pct: number;
  tactical_bias: BiasCategory;
  weekly_bias: BiasCategory;
  score: number;
  weekly_score: number;
  confidence: number;
  primary_driver: string;
  updated_at: string;
}

export interface FactorContribution {
  category: string;
  label: string;
  raw_score: number;
  weight: number;
  contribution: number;
  status: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  source_count: number;
}

export interface InvalidationCondition {
  id: string;
  condition: string;
  likelihood: 'Low' | 'Medium' | 'High';
  impact_if_triggered: string;
  metric_to_watch: string;
}

export interface ScenarioItem {
  title: string;
  probability: number;
  description: string;
  implications: string;
  triggers: string[];
}

export interface AssetDetail {
  symbol: string;
  name: string;
  asset_class: 'forex' | 'index' | 'metal' | 'commodity' | 'crypto';
  base_currency?: string;
  quote_currency?: string;
  current_price: number;
  daily_change_pct: number;
  tactical_bias: BiasCategory;
  weekly_bias: BiasCategory;
  score: number;
  weekly_score: number;
  confidence: number;
  primary_driver: string;
  secondary_driver: string;
  bullish_factors: string[];
  bearish_factors: string[];
  conflicting_factors: string[];
  invalidation_conditions: InvalidationCondition[];
  scenario_bull?: ScenarioItem;
  scenario_base?: ScenarioItem;
  scenario_bear?: ScenarioItem;
  data_quality: {
    status: 'HEALTHY' | 'WARNING' | 'INSUFFICIENT_DATA';
    completeness_pct: number;
    stale_factors?: string[];
    conflicting_signals?: string[];
  };
  factor_breakdown: FactorContribution[];
  explanation: string;
  timestamp: string;
}

export interface MacroRegime {
  primary_regime: string;
  active_regimes: string[];
  risk_sentiment: 'RISK_ON' | 'RISK_OFF' | 'NEUTRAL';
  liquidity_cycle: 'EXPANDING' | 'CONTRACTING' | 'NEUTRAL';
  growth_cycle: 'EXPANSION' | 'SLOWDOWN' | 'CONTRACTION';
  inflation_cycle: 'INFLATIONARY' | 'DISINFLATIONARY' | 'STAGFLATIONARY' | 'MODERATE_INFLATION';
  summary: string;
  key_drivers: string[];
  timestamp: string;
}

export interface CurrencyMatrixItem {
  currency: string;
  name: string;
  absolute_score: number;
  weekly_score: number;
  rank: number;
  policy_stance: string;
  growth_stance: string;
  relative_scores: Record<string, number>;
}

export interface ForexRankingItem {
  rank: number;
  symbol: string;
  name: string;
  tactical_score: number;
  weekly_score: number;
  bias: BiasCategory;
  confidence: number;
  conviction_score: number;
  primary_driver: string;
}

export interface GoldDashboard {
  symbol: string;
  name: string;
  score: number;
  bias: BiasCategory;
  confidence: number;
  drivers: {
    gold_macro_score: number;
    real_yield_pressure: number;
    usd_pressure: number;
    fed_expectations: number;
    geopolitical_demand: number;
    central_bank_demand: number;
    primary_driver: string;
  };
  narrative: string;
}

export interface OilDashboard {
  symbol: string;
  name: string;
  score: number;
  bias: BiasCategory;
  confidence: number;
  drivers: {
    oil_macro_score: number;
    opec_discipline: number;
    china_demand_drag: number;
    inventory_draw_support: number;
    geopolitical_risk: number;
    global_growth: number;
    primary_driver: string;
  };
  narrative: string;
}

export interface CalendarEvent {
  id: string;
  country: string;
  currency: string;
  event: string;
  category: string;
  event_time: string;
  consensus: string;
  previous: string;
  actual?: string;
  status?: 'UPCOMING' | 'COMPLETED';
  surprise?: 'BEAT' | 'MISS' | 'IN_LINE' | null;
  importance: 'Critical' | 'High' | 'Medium' | 'Low';
  expected_volatility: 'High' | 'Medium' | 'Low';
  affected_assets: string[];
  sensitivity: string;
}

export interface WhatChangedItem {
  id: number;
  asset_symbol: string;
  timestamp: string;
  previous_bias: BiasCategory;
  new_bias: BiasCategory;
  previous_score: number;
  new_score: number;
  delta_score: number;
  primary_driver: string;
  secondary_driver?: string;
  confidence: number;
}

export interface AlertItem {
  id: number;
  asset_symbol?: string;
  alert_type: string;
  title: string;
  message: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  timestamp: string;
}

export interface SystemHealthData {
  overall_status: string;
  timestamp: string;
  active_sources_count: number;
  total_events_processed: number;
  cache_connected: boolean;
  ai_service_available: boolean;
  data_freshness_seconds: number;
  components: Array<{
    component: string;
    status: string;
    latency_ms: number;
    error_rate_pct: number;
    message?: string;
    last_check: string;
  }>;
  recent_errors: string[];
}

// ---------------------------------------------------------------------------
// Validation Engine Types
// ---------------------------------------------------------------------------

export interface WalkForwardWindow {
  window_id: number;
  train_start: string;
  train_end: string;
  val_start: string;
  val_end: string;
  train_accuracy_pct: number;
  val_accuracy_pct: number;
  n_train_signals: number;
  n_val_signals: number;
  regime_at_val: string;
}

export interface CalibrationBin {
  bin_label: string;
  bin_min: number;
  bin_max: number;
  n_observations: number;
  model_confidence_avg: number;
  actual_hit_rate: number;
  is_well_calibrated: boolean;
}

export interface RegimeHitRate {
  regime: string;
  directional_accuracy_pct: number;
  n_signals: number;
  p_value: number;
  is_significant: boolean;
}

export interface FalseSignal {
  as_of_date: string;
  predicted_direction: string;
  score_at_signal: number;
  confidence_at_signal: number;
  reversal_day: number;
  reversal_return_pct: number;
  regime: string;
}

export interface ConfusionMatrix {
  true_positive: number;
  false_positive: number;
  true_negative: number;
  false_negative: number;
  precision: number;
  recall: number;
  f1_score: number;
}

export interface ValidationResult {
  asset_symbol: string;
  generated_at: string;
  horizon_days: number;
  overall_accuracy_pct: number;
  n_total_signals: number;
  n_bullish_signals: number;
  n_bearish_signals: number;
  n_neutral_periods: number;
  bullish_accuracy_pct: number;
  bearish_accuracy_pct: number;
  avg_gain_pct: number;
  avg_loss_pct: number;
  win_loss_ratio: number;
  sharpe_equivalent: number;
  bias_persistence_half_life_days: number;
  oos_accuracy_pct: number;
  information_coefficient: number;
  walk_forward_windows: WalkForwardWindow[];
  calibration_bins: CalibrationBin[];
  regime_hit_rates: RegimeHitRate[];
  false_signals: FalseSignal[];
  false_signal_rate_pct: number;
  confusion_matrix: ConfusionMatrix;
  disclaimer: string;
}

export interface CalibrationData {
  asset_symbol: string;
  horizon_days: number;
  calibration_bins: CalibrationBin[];
  overall_accuracy_pct: number;
  n_total_signals: number;
}

// ---------------------------------------------------------------------------
// Data Integrity Engine Types
// ---------------------------------------------------------------------------

export interface ProviderHeartbeat {
  provider_id: string;
  provider_name: string;
  data_category: string;
  country: string;
  last_seen: string;
  expected_interval_minutes: number;
  status: 'LIVE' | 'DELAYED' | 'STALE' | 'OFFLINE';
  freshness_delta_minutes: number;
  schema_drift_events_24h: number;
  consecutive_failures: number;
}

export interface SchemaReport {
  provider_id: string;
  expected_fields: string[];
  received_fields: string[];
  missing_fields: string[];
  extra_fields: string[];
  drift_events_24h: number;
  last_validated: string;
  is_healthy: boolean;
}

export interface GapDetection {
  release_id: string;
  expected_release: string;
  country: string;
  expected_window_start: string;
  hours_overdue: number;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  auto_action: string;
}

export interface ReconciliationResult {
  indicator_name: string;
  country: string;
  provider_a: string;
  value_a: number;
  provider_b: string;
  value_b: number;
  divergence_pct: number;
  is_flagged: boolean;
  flagged_at: string;
}

export interface IntegrityIncident {
  incident_id: string;
  occurred_at: string;
  event_type: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  provider_id: string | null;
  description: string;
  auto_action_taken: string;
  resolved: boolean;
}

export interface IntegrityStatus {
  computed_at: string;
  integrity_score: number;
  freshness_score: number;
  schema_health_score: number;
  gap_rate_score: number;
  circuit_breaker_active: boolean;
  circuit_breaker_triggered_at: string | null;
  circuit_breaker_reason: string | null;
  provider_heartbeats: ProviderHeartbeat[];
  schema_reports: SchemaReport[];
  gap_detections: GapDetection[];
  reconciliation_results: ReconciliationResult[];
  incidents: IntegrityIncident[];
}

export interface LiveStatus {
  is_active: boolean;
  status: string;
  last_price_sync: string | null;
  last_calendar_sync: string | null;
  last_news_sync: string | null;
  total_price_updates: number;
  total_calendar_events: number;
  total_news_events: number;
  last_error: string | null;
  providers_monitored: number;
  cost: string;
  timestamp: string;
}

export interface Regime15YPerformance {
  regime_id: string;
  regime_name: string;
  start_date: string;
  end_date: string;
  total_signals: number;
  correct_signals: number;
  hit_rate_pct: number;
  avg_gain_pct: number;
  avg_loss_pct: number;
  win_loss_ratio: number;
  sharpe_equivalent: number;
  description: string;
}

export interface Milestone15YCaseStudy {
  date: string;
  event_title: string;
  macro_context: string;
  model_score: number;
  predicted_bias: string;
  actual_market_move: string;
  forward_return_pct: number;
  verdict: string;
}

export interface Equity15YPoint {
  date: string;
  strategy_equity: number;
  enhanced_equity?: number;
  buy_hold_equity: number;
  drawdown_pct: number;
  enhanced_drawdown_pct?: number;
  signal: string;
  enhanced_signal?: string;
  score: number;
}

export interface Historical15YReport {
  asset_symbol: string;
  asset_name: string;
  start_date: string;
  end_date: string;
  total_weeks: number;
  evaluated_horizon_weeks: number;
  overall_hit_rate_pct: number;
  total_signals: number;
  bullish_signals_count: number;
  bullish_hit_rate_pct: number;
  bearish_signals_count: number;
  bearish_hit_rate_pct: number;
  neutral_signals_count: number;
  win_loss_ratio: number;
  sharpe_equivalent: number;
  information_coefficient: number;
  max_drawdown_pct: number;
  cumulative_strategy_return_pct: number;
  cumulative_buy_hold_return_pct: number;
  walk_forward_oos_accuracy_pct: number;
  enhanced_hit_rate_pct?: number;
  enhanced_sharpe_equivalent?: number;
  enhanced_win_loss_ratio?: number;
  enhanced_max_drawdown_pct?: number;
  enhanced_cumulative_return_pct?: number;
  enhanced_signals_count?: number;
  disclaimer: string;
  regime_breakdowns: Regime15YPerformance[];
  milestone_case_studies: Milestone15YCaseStudy[];
  equity_curve: Equity15YPoint[];
}

export interface Historical15YSummaryItem {
  symbol: string;
  name: string;
  total_signals: number;
  overall_hit_rate_pct: number;
  bullish_hit_rate_pct: number;
  bearish_hit_rate_pct: number;
  sharpe_equivalent: number;
  win_loss_ratio: number;
  information_coefficient: number;
  max_drawdown_pct: number;
  cumulative_strategy_return_pct: number;
  cumulative_buy_hold_return_pct: number;
  oos_accuracy_pct: number;
}

// ── CFTC Commitments of Traders (COT) & Confluence Types ──

export interface COTPositionSnapshot {
  symbol: string;
  asset_name: string;
  cftc_contract_code: string;
  report_date: string;
  non_commercial_long: number;
  non_commercial_short: number;
  commercial_long: number;
  commercial_short: number;
  total_open_interest: number;
  net_speculative: number;
  net_commercial: number;
  spec_net_pct_oi: number;
  cot_zscore_3y: number;
  crowding_index: number;
  positioning_trend_4w: number;
  sentiment_label: string;
  squeeze_warning: string | null;
}

export interface ConfluencePillar {
  name: string;
  label: string;
  score: number;
  weight: number;
  status: string;
  details: string;
}

export interface ConfluenceChecklistItem {
  title: string;
  passed: boolean;
  note: string;
}

export interface TraderConfluenceCard {
  symbol: string;
  asset_name: string;
  current_price: number;
  daily_atr: number;
  high_conviction_score: number;
  high_conviction_bias: string;
  confidence_pct: number;
  primary_direction: string;
  execution_directive: string;
  invalidation_price_level: number;
  cot_crowding_index: number;
  cot_zscore_3y: number;
  cot_sentiment_label: string;
  squeeze_warning: string | null;
  pillars: ConfluencePillar[];
  checklist: ConfluenceChecklistItem[];
  disclaimer: string;
  ml_prediction?: {
    predicted_bias: string;
    ml_conviction_score: number;
    probability_distribution: { BULLISH: number; NEUTRAL: number; BEARISH: number };
    feature_importances: Array<{ feature: string; label: string; importance_weight: number; current_value: number; directional_impact: string }>;
    model_version: string;
    regime_alignment: string;
  };
  dynamic_weights?: Record<string, number>;
}


// ── AI & ML Intelligence Hub Types ──────────────────────────────────────────

export interface MLFeatureImportance {
  feature: string;
  label: string;
  importance_weight: number;
  current_value: number;
  directional_impact: string;
}

export interface MLPredictionResponse {
  symbol: string;
  predicted_bias: string;
  ml_conviction_score: number;
  probability_distribution: { BULLISH: number; NEUTRAL: number; BEARISH: number };
  feature_importances: MLFeatureImportance[];
  dynamic_weights: Record<string, number>;
  regime_alignment: string;
  model_version: string;
}

export interface MLModelStatus {
  model_architecture: string;
  is_trained: boolean;
  validation_accuracy: number;
  f1_macro_score: number;
  features_monitored: number;
  feature_names: string[];
  top_features_by_importance: Array<{ feature: string; weight: number }>;
  regime_adaptive_weighting: string;
  inference_latency_ms: string;
}

export interface DynamicWeightsResponse {
  asset_class: string;
  regime: string;
  static_weights: Record<string, number>;
  dynamic_weights: Record<string, number>;
  adaptation_status: string;
}

export interface RAGCitation {
  id: string;
  title: string;
  institution: string;
  date: string;
  relevance_score: number;
  takeaway: string;
}

export interface CopilotResponse {
  query: string;
  response: string;
  provider: string;
  citations: RAGCitation[];
  timestamp: string;
}

export interface RAGSearchResultItem {
  id: string;
  title: string;
  institution: string;
  date: string;
  category: string;
  content: string;
  key_takeaway: string;
  historical_asset_reaction: string;
  relevance_score: number;
  snippet: string;
}

export interface RAGSearchResponse {
  query: string;
  count: number;
  results: RAGSearchResultItem[];
}

export interface NLPSentimentAnalysis {
  sentiment_score: number;
  hawkish_dovish_score: number;
  growth_sentiment: number;
  inflation_pressure: number;
  direction: string;
  statement_type: string;
  confidence: number;
  detected_currencies: string[];
  key_signals: string[];
}


// ── Regime Signal Scanner Types ───────────────────────────────────────────────

export interface RegimeSignalRegimeBreakdown {
  regime_id: string;
  regime_name: string;
  total: number;
  hit_rate_pct: number;
  avg_return: number;
}

export interface RegimeSignal {
  signal_id: string;
  symbol: string;
  asset_name: string;
  signal_type: 'REVERSAL' | 'CONTINUATION';
  direction: 'BULLISH' | 'BEARISH';
  strength: 'MAJOR' | 'MODERATE' | 'MINOR';
  macro_score_now: number;
  macro_score_4w_ago: number;
  score_delta: number;
  cot_zscore: number;
  cot_zscore_momentum: number;
  crowding_index: number;
  pillars_aligned: number;
  confluence_pct: number;
  entry_context: string;
  invalidation_context: string;
  current_price: number;
  signal_date: string;
  backtest_hit_rate: number;
  backtest_sample_size: number;
  backtest_avg_gain_pct: number;
  backtest_sharpe: number;
  regime_breakdown: RegimeSignalRegimeBreakdown[];
}

export interface RegimeSignalsResponse {
  count: number;
  signals: RegimeSignal[];
  generated_at: string;
}

export interface ScoreHistoryPoint {
  date: string;
  score: number;
  bias: string;
  cot_zscore: number;
}

export interface RegimeSignalAssetResponse {
  symbol: string;
  asset_name: string;
  current_price: number;
  signals: RegimeSignal[];
  score_history: ScoreHistoryPoint[];
  generated_at: string;
}

export interface RegimeBacktestTimeline {
  date: string;
  direction: string;
  strength: string;
  forward_return_pct: number;
  is_correct: boolean;
  confluence_pct: number;
  entry_price?: number;
  exit_price?: number;
  outcome?: 'WIN' | 'LOSS';
  macro_score?: number;
  cot_zscore?: number;
  regime_name?: string;
}

export interface RegimeSignalBacktest {
  symbol: string;
  signal_type: string;
  total_signals_found: number;
  hit_rate_pct: number;
  avg_gain_pct: number;
  avg_loss_pct: number;
  win_loss_ratio: number;
  sharpe_equivalent: number;
  max_consecutive_wins: number;
  max_consecutive_losses: number;
  best_regime: string;
  worst_regime: string;
  regime_breakdown: RegimeSignalRegimeBreakdown[];
  timeline: RegimeBacktestTimeline[];
  evaluation_period: string;
}

export interface ForwardTestEntry {
  signal_id: string;
  symbol: string;
  asset_name: string;
  signal_type: string;
  direction: string;
  strength: string;
  issue_date: string;
  issue_price: number;
  horizon_days: number;
  target_date: string;
  current_price: number;
  realized_return_pct: number;
  is_resolved: boolean;
  outcome: 'WIN' | 'LOSS' | 'DRAW' | 'PENDING';
  confluence_pct: number;
  backtest_hit_rate: number;
}

export interface ForwardTestStats {
  total_logged: number;
  total_resolved: number;
  total_pending: number;
  rolling_accuracy_pct: number;
  wins: number;
  losses: number;
  draws: number;
  avg_win_pct: number;
  avg_loss_pct: number;
  forward_sharpe: number;
  by_signal_type: Record<string, { total: number; wins: number; accuracy_pct: number }>;
  by_strength: Record<string, { total: number; wins: number; accuracy_pct: number }>;
}

export interface ForwardTestLogResponse {
  stats: ForwardTestStats;
  entries: ForwardTestEntry[];
  generated_at: string;
}

export interface HistoricalPastSignal {
  signal_id: string;
  date: string;
  symbol: string;
  asset_name: string;
  signal_type: 'REVERSAL' | 'CONTINUATION';
  direction: 'BULLISH' | 'BEARISH';
  strength: 'MAJOR' | 'MODERATE' | 'MINOR';
  outcome: 'WIN' | 'LOSS';
  entry_price: number;
  exit_price: number;
  forward_return_pct: number;
  macro_score: number;
  cot_zscore: number;
  confluence_pct: number;
  regime_name: string;
  horizon_weeks: number;
}

export interface HistoricalSignalsResponse {
  total_signals: number;
  total_wins: number;
  total_losses: number;
  hit_rate_pct: number;
  win_loss_ratio: number;
  avg_win_pct: number;
  avg_loss_pct: number;
  signals: HistoricalPastSignal[];
  filters_applied: {
    symbol?: string;
    signal_type?: string;
    outcome?: string;
    horizon_weeks?: number;
    limit?: number;
  };
  generated_at: string;
}

// ?? CFTC Legacy Commitments of Traders (COT) Net Positions Types ??
export interface COTReportCell {
  date: string;
  value: number;
  formatted: string;
  is_52w_high: boolean;
  is_52w_low: boolean;
  prior_was_positive: boolean;
  prior_was_negative: boolean;
  sign_flipped: boolean;
}

export interface COTReportRow {
  id: string;
  commodity: string;
  symbol: string;
  category: string;
  is_pair: boolean;
  is_inverted: boolean;
  high_52w: number;
  high_52w_formatted: string;
  low_52w: number;
  low_52w_formatted: string;
  weekly_change: number;
  weekly_change_formatted: string;
  cells: COTReportCell[];
}

export interface LegacyCOTReportResponse {
  title: string;
  subtitle: string;
  dates: string[];
  current_trader_group: string;
  category: string;
  available_categories: string[];
  trader_groups: Array<{ id: string; label: string }>;
  total_commodities: number;
  rows: COTReportRow[];
  next_release_dates?: Array<{ date: string; release: string }>;
  next_release_info?: {
    next_cutoff_date: string;
    next_release_date: string;
    frequency: string;
  };
  timestamp: string;
}

export interface LegacyCOTChartHistory {
  commodity: string;
  symbol: string;
  category: string;
  high_52w: number;
  low_52w: number;
  history: Array<{
    date: string;
    non_commercial_net: number;
    commercial_net: number;
    open_interest: number;
  }>;
}

// ?? cot-reports.com COT Index Charting Types ??
export interface COTMarketInfo {
  symbol: string;
  ticker: string;
  name: string;
  full_name: string;
  exchange: string;
  cftc_code: string;
  category: string;
  subcategory: string;
  contract_units?: string;
  color?: string;
}

export interface COTCategoryItem {
  name: string;
  color?: string;
  subcategories: Array<{
    name: string;
    markets: COTMarketInfo[];
  }>;
}

export interface COTIndexChartPoint {
  date: string;
  date_short: string;
  date_iso: string;
  cot_index: number;
  price: number;
  net: number;
  open_interest: number;
  zone_label: string;
  is_extreme_long: boolean;
  is_extreme_short: boolean;
}

export interface COTIndexChartResponse {
  market: COTMarketInfo;
  categories?: COTCategoryItem[];
  parameters: {
    timeframe: string;
    trader_group: string;
    periods: number;
  };
  current_summary: {
    date: string;
    cot_index: number;
    price: number;
    net: number;
    net_formatted: string;
    zone_label: string;
    weekly_change: number;
  };
  legend: {
    series: Array<{ id: string; name: string; value?: number; area?: boolean }>;
    zones: Array<{ id: string; label: string; color: string }>;
  };
  history: COTIndexChartPoint[];
  status_footer: string;
}

export interface COTIndexMarketsResponse {
  markets: COTMarketInfo[];
  popular: string[];
  categories?: COTCategoryItem[];
}


export interface COTWeeklyBreakdownRow {
  date_formatted: string;
  date_iso: string;
  date_short: string;
  noncomm_long: number;
  noncomm_short: number;
  change_noncomm_long: number;
  change_noncomm_short: number;
  noncomm_net: number;
  noncomm_spreading: number;
  pct_oi_noncomm_spreading: number;
  pct_oi_noncomm_long: number;
  pct_oi_noncomm_short: number;
  comm_long: number;
  comm_short: number;
  change_comm_long: number;
  change_comm_short: number;
  comm_net: number;
  pct_oi_comm_long: number;
  pct_oi_comm_short: number;
  nonrept_long: number;
  nonrept_short: number;
  change_nonrept_long: number;
  change_nonrept_short: number;
  nonrept_net: number;
  pct_oi_nonrept_long: number;
  pct_oi_nonrept_short: number;
  open_interest: number;
  change_open_interest: number;
  price?: number;
}

export interface COTWeeklyBreakdownResponse {
  market: COTMarketInfo;
  timeframe: string;
  records_count: number;
  date_range_label: string;
  latest_date: string;
  next_release_date: string;
  reports: COTWeeklyBreakdownRow[];
}
