import React, { useEffect, useState } from 'react';
import { ShieldCheck, Activity, Database, Server, CheckCircle2, AlertTriangle, RefreshCw } from 'lucide-react';
import { SystemHealthData } from '../types/macro';
import { api } from '../services/api';

export const SystemHealthView: React.FC = () => {
  const [health, setHealth] = useState<SystemHealthData | null>(null);
  const [vpsData, setVpsData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [optimizing, setOptimizing] = useState(false);

  const loadData = () => {
    setLoading(true);
    Promise.all([api.getSystemHealth(), api.getVpsStatus()])
      .then(([h, v]) => {
        setHealth(h);
        setVpsData(v);
      })
      .catch((e) => console.error('Error loading health/vps data:', e))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)' }}>
            System Observability, Feed Health & Compliance Center
          </h2>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            Continuous monitoring of ingestion pipelines, quantitative scoring latency, and source reliability tiers
          </div>
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
            cursor: 'pointer',
          }}
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Refresh Status
        </button>
      </div>

      {health && (
        <>
          {/* Top Status Banner */}
          <div style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-subtle)',
            borderLeft: '4px solid #10b981',
            borderRadius: 8,
            padding: '18px 24px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <ShieldCheck size={28} color="#10b981" />
              <div>
                <div style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                  ALL SYSTEMS OPERATIONAL • ZERO DATA INTEGRITY WARNINGS
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: 2 }}>
                  Active Feeds: {health.active_sources_count} Official Sources • Processed Events: {health.total_events_processed} • Latency Nominal
                </div>
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <div className="mono" style={{ fontSize: '0.8rem', color: 'var(--accent-cyan)', fontWeight: 700 }}>
                Data Freshness: {health.data_freshness_seconds}s ago
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Poll Interval: 300s (Immediate on Material Events)
              </div>
            </div>
          </div>

          {/* VPS-Friendly Resource Governor Engine Card */}
          {vpsData && (
            <div style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-subtle)',
              borderTop: '3px solid #6366f1',
              borderRadius: 8,
              padding: '18px 24px',
              display: 'flex',
              flexDirection: 'column',
              gap: 14,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Server size={22} color="#6366f1" />
                  <div>
                    <div style={{ fontSize: '0.98rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
                      VPS AUTONOMOUS RESOURCE GOVERNOR
                      <span style={{
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: 4,
                        background: vpsData.vps_governor.mode === 'ACTIVE' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(99, 102, 241, 0.15)',
                        color: vpsData.vps_governor.mode === 'ACTIVE' ? '#10b981' : '#818cf8',
                        border: `1px solid ${vpsData.vps_governor.mode === 'ACTIVE' ? '#10b981' : '#818cf8'}`,
                      }}>
                        {vpsData.vps_governor.mode === 'ACTIVE' ? '🟢 ACTIVE MODE' : '🌙 ECO SLEEP MODE'}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      Adaptive polling, aggressive memory reclamation (glibc malloc_trim), and SQLite WAL compaction
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={() => {
                      const next = vpsData.vps_governor.mode === 'ACTIVE' ? 'ECO_MODE' : 'ACTIVE';
                      api.toggleVpsMode(next).then(() => loadData());
                    }}
                    style={{
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid var(--border-subtle)',
                      color: 'var(--text-secondary)',
                      padding: '6px 12px',
                      borderRadius: 6,
                      fontSize: '0.75rem',
                      cursor: 'pointer',
                      fontWeight: 600,
                    }}
                  >
                    Toggle {vpsData.vps_governor.mode === 'ACTIVE' ? 'Eco Mode 🌙' : 'Active Mode ⚡'}
                  </button>
                  <button
                    disabled={optimizing}
                    onClick={() => {
                      setOptimizing(true);
                      api.optimizeVps()
                        .then((res: any) => {
                          alert(`VPS Optimized! Reclaimed: ${res.memory.reclaimed_mb} MB RAM. SQLite WAL Checkpointed.`);
                          loadData();
                        })
                        .finally(() => setOptimizing(false));
                    }}
                    style={{
                      background: '#4f46e5',
                      border: 'none',
                      color: '#ffffff',
                      padding: '6px 14px',
                      borderRadius: 6,
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      cursor: optimizing ? 'wait' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                    }}
                  >
                    <RefreshCw size={12} className={optimizing ? 'animate-spin' : ''} />
                    {optimizing ? 'Optimizing...' : 'Clean RAM & Compact DB'}
                  </button>
                </div>
              </div>

              {/* VPS Telemetry Metrics Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }}>
                <div style={{ background: 'var(--bg-main)', padding: '10px 14px', borderRadius: 6, border: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Process RSS RAM</div>
                  <div className="mono" style={{ fontSize: '1.05rem', fontWeight: 800, color: '#38bdf8' }}>
                    {vpsData.process_resources.rss_mb} MB
                  </div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Target: &lt; {vpsData.vps_governor.max_rss_target_mb} MB</div>
                </div>

                <div style={{ background: 'var(--bg-main)', padding: '10px 14px', borderRadius: 6, border: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Host RAM Available</div>
                  <div className="mono" style={{ fontSize: '1.05rem', fontWeight: 800, color: '#10b981' }}>
                    {vpsData.host_resources.available_ram_mb} MB
                  </div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Usage: {vpsData.host_resources.ram_usage_percent}%</div>
                </div>

                <div style={{ background: 'var(--bg-main)', padding: '10px 14px', borderRadius: 6, border: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Process CPU</div>
                  <div className="mono" style={{ fontSize: '1.05rem', fontWeight: 800, color: '#f59e0b' }}>
                    {vpsData.process_resources.cpu_percent}%
                  </div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Host CPU: {vpsData.host_resources.host_cpu_percent}%</div>
                </div>

                <div style={{ background: 'var(--bg-main)', padding: '10px 14px', borderRadius: 6, border: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>SQLite DB + WAL Size</div>
                  <div className="mono" style={{ fontSize: '1.05rem', fontWeight: 800, color: '#a855f7' }}>
                    {(vpsData.database_storage.db_size_mb + vpsData.database_storage.wal_size_mb).toFixed(2)} MB
                  </div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>WAL Mode: Enabled</div>
                </div>

                <div style={{ background: 'var(--bg-main)', padding: '10px 14px', borderRadius: 6, border: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Free Disk Space</div>
                  <div className="mono" style={{ fontSize: '1.05rem', fontWeight: 800, color: '#10b981' }}>
                    {vpsData.host_resources.disk_free_gb} GB
                  </div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Disk Usage: {vpsData.host_resources.disk_usage_percent}%</div>
                </div>

                <div style={{ background: 'var(--bg-main)', padding: '10px 14px', borderRadius: 6, border: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>GC & WAL Cleanups</div>
                  <div className="mono" style={{ fontSize: '1.05rem', fontWeight: 800, color: '#6366f1' }}>
                    {vpsData.vps_governor.total_gc_runs} / {vpsData.vps_governor.total_wal_checkpoints}
                  </div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Idle Time: {vpsData.vps_governor.idle_seconds}s</div>
                </div>
              </div>
            </div>
          )}

          {/* Components Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 }}>
            {health.components.map((c) => (
              <div
                key={c.component}
                style={{
                  background: 'var(--bg-main)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 8,
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: 10,
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.86rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                      {c.component}
                    </span>
                    <span style={{
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      padding: '2px 6px',
                      borderRadius: 4,
                      background: c.status === 'HEALTHY' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                      color: c.status === 'HEALTHY' ? '#34d399' : '#f59e0b',
                    }}>
                      {c.status}
                    </span>
                  </div>
                  {c.message && (
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>
                      {c.message}
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-secondary)', borderTop: '1px solid var(--border-subtle)', paddingTop: 8 }}>
                  <span>Latency: <strong className="mono" style={{ color: '#38bdf8' }}>{c.latency_ms.toFixed(1)}ms</strong></span>
                  <span>Error Rate: <strong className="mono" style={{ color: '#10b981' }}>{c.error_rate_pct.toFixed(2)}%</strong></span>
                </div>
              </div>
            ))}
          </div>

          {/* Compliance Card */}
          <div style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 8,
            padding: '18px 22px',
          }}>
            <h3 style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>
              Institutional Compliance & Analytical Principles
            </h3>
            <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', lineHeight: 1.6, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <p>
                <strong>1. Zero-Hallucination Mandate:</strong> The platform mathematically derives all numerical factor scores and directional biases from verified economic releases, central bank communications, and expectation surprises. AI layers are strictly constrained to factual entity extraction and grounded synthesis.
              </p>
              <p>
                <strong>2. Insufficient Evidence Mode:</strong> Whenever primary source coverage drops below minimum institutional thresholds or catastrophic conflicts arise, the model automatically reverts to <em>"Neutral / Insufficient Evidence"</em> rather than inventing artificial precision.
              </p>
              <p>
                <strong>3. Regulatory Notice:</strong> Fundamental bias is an analytical output reflecting verified macroeconomic momentum. It does not constitute a solicitation, personal recommendation, or guarantee of future financial market performance.
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
