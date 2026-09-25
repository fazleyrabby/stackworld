import React from 'react';
import { SimulationSnapshot } from '../shared/types';
import { useUiStore } from '../state/useUiStore';
import { X, Server, Users, Cpu, HardDrive, Wifi, Activity, Terminal, Database, Layers, Zap } from 'lucide-react';

interface InspectorProps {
  snapshot: SimulationSnapshot;
}

export const Inspector: React.FC<InspectorProps> = ({ snapshot }) => {
  const selectedEntityId = useUiStore((state) => state.selectedEntityId);
  const setSelectedEntityId = useUiStore((state) => state.setSelectedEntityId);
  const activeTab = useUiStore((state) => state.activeInspectorTab);
  const setActiveTab = useUiStore((state) => state.setActiveInspectorTab);

  if (!selectedEntityId) return null;

  const entity = snapshot.entities.find((e) => e.id === selectedEntityId);
  if (!entity) return null;

  const isRedis = entity.type === 'redis';
  const isQueue = entity.type === 'queue';
  const isWorker = entity.type === 'worker';
  const isServer = entity.type === 'static_host' || entity.type === 'server' || entity.type === 'api' || entity.type === 'database' || isRedis || isQueue || isWorker;
  const isDb = entity.type === 'database';
  const isPooler = entity.type === 'pgbouncer';

  const cpuPct = Math.round(entity.resources.cpu.utilizationPct);
  const memPct = Math.round(entity.resources.memory.utilizationPct);
  const connPct = Math.round((entity.resources.connections.current / entity.resources.connections.max) * 100);

  const getMeterColor = (pct: number) => {
    if (pct >= 85) return 'var(--rose)';
    if (pct >= 70) return 'var(--amber)';
    return 'var(--cyan)';
  };

  const getNodeIcon = () => {
    if (entity.type === 'redis') return <Zap size={16} color="#ef4444" />;
    if (entity.type === 'queue') return <Layers size={16} color="#f97316" />;
    if (entity.type === 'worker') return <Cpu size={16} color="#f97316" />;
    if (entity.type === 'database') return <Database size={16} />;
    if (entity.type === 'pgbouncer') return <Layers size={16} />;
    if (isServer) return <Server size={16} />;
    return <Users size={16} />;
  };

  return (
    <aside className="inspector-panel">
      {/* Header */}
      <div className="inspector-header">
        <div className="inspector-header-left">
          <div className="node-icon-box">
            {getNodeIcon()}
          </div>
          <div>
            <h2 className="node-title">{entity.name}</h2>
            <span className="node-sub">{entity.id}</span>
          </div>
        </div>

        <button
          onClick={() => setSelectedEntityId(null)}
          className="inspector-close-btn"
          title="Close Inspector"
        >
          <X size={16} />
        </button>
      </div>

      {/* Tabs */}
      <div className="inspector-tabs">
        <button
          onClick={() => setActiveTab('metrics')}
          className={`inspector-tab-btn ${activeTab === 'metrics' ? 'active' : ''}`}
        >
          Metrics
        </button>
        <button
          onClick={() => setActiveTab('config')}
          className={`inspector-tab-btn ${activeTab === 'config' ? 'active' : ''}`}
        >
          Config
        </button>
        <button
          onClick={() => setActiveTab('logs')}
          className={`inspector-tab-btn ${activeTab === 'logs' ? 'active' : ''}`}
        >
          Logs
        </button>
      </div>

      {/* Tab Content */}
      <div className="inspector-body">
        {/* Status Row */}
        <div className="status-row">
          <span style={{ color: 'var(--text-muted)' }}>Health State:</span>
          <span className={`health-pill ${
            entity.status === 'HEALTHY' ? 'health-healthy' : entity.status === 'DEGRADED' ? 'health-degraded' : 'health-failing'
          }`}>
            {entity.status}
          </span>
        </div>

        {activeTab === 'metrics' && (
          <>
            {isServer ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {/* CPU Meter */}
                <div className="metric-card">
                  <div className="metric-card-top">
                    <div className="metric-card-title">
                      <Cpu size={14} color="var(--cyan)" />
                      <span>CPU Utilization</span>
                    </div>
                    <span className="metric-card-val">{cpuPct}%</span>
                  </div>
                  <div className="meter-track">
                    <div
                      className="meter-fill"
                      style={{
                        transform: `scaleX(${Math.min(1, Math.max(0, cpuPct / 100))})`,
                        backgroundColor: getMeterColor(cpuPct),
                      }}
                    />
                  </div>
                  <div className="meter-card-bottom">
                    <span>{entity.resources.cpu.usedCores} Cores used</span>
                    <span>{entity.resources.cpu.capacityCores} Cores Total</span>
                  </div>
                </div>

                {/* Memory Meter */}
                <div className="metric-card">
                  <div className="metric-card-top">
                    <div className="metric-card-title">
                      <HardDrive size={14} color="var(--emerald)" />
                      <span>Memory (RAM)</span>
                    </div>
                    <span className="metric-card-val">{memPct}%</span>
                  </div>
                  <div className="meter-track">
                    <div
                      className="meter-fill"
                      style={{
                        transform: `scaleX(${Math.min(1, Math.max(0, memPct / 100))})`,
                        backgroundColor: 'var(--emerald)',
                      }}
                    />
                  </div>
                  <div className="meter-card-bottom">
                    <span>{entity.resources.memory.usedMb} MB used</span>
                    <span>{entity.resources.memory.capacityMb} MB Total</span>
                  </div>
                </div>

                {/* Connection Pool */}
                <div className="metric-card">
                  <div className="metric-card-top">
                    <div className="metric-card-title">
                      <Wifi size={14} color="var(--purple)" />
                      <span>Connection Pool</span>
                    </div>
                    <span className="metric-card-val">{connPct}%</span>
                  </div>
                  <div className="meter-track">
                    <div
                      className="meter-fill"
                      style={{
                        transform: `scaleX(${Math.min(1, Math.max(0, connPct / 100))})`,
                        backgroundColor: 'var(--purple)',
                      }}
                    />
                  </div>
                  <div className="meter-card-bottom">
                    <span>{entity.resources.connections.current} Active Connections</span>
                    <span>{entity.resources.connections.max} Max Capacity</span>
                  </div>
                </div>

                {/* Monthly Cost */}
                <div className="status-row">
                  <span style={{ color: 'var(--text-muted)' }}>Simulated Cost</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--emerald)' }}>
                    ${entity.costMonthly.toFixed(2)} / month
                  </span>
                </div>

                {/* Database Execution Profile */}
                {isDb && (
                  <div className="metric-card" style={{ border: Boolean(entity.configuration.hasIndex) ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(245, 158, 11, 0.4)' }}>
                    <div className="metric-card-top">
                      <div className="metric-card-title">
                        <Database size={14} color={Boolean(entity.configuration.hasIndex) ? 'var(--emerald)' : 'var(--amber)'} />
                        <span>Query Execution Engine</span>
                      </div>
                      <span className={`health-pill ${Boolean(entity.configuration.hasIndex) ? 'health-healthy' : 'health-degraded'}`} style={{ padding: '2px 6px', fontSize: '10px', minWidth: 'unset' }}>
                        {Boolean(entity.configuration.hasIndex) ? 'INDEX SCAN' : 'FULL TABLE SCAN'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '11px', marginTop: '6px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Target Table:</span>
                        <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>500,000 orders</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Query Latency:</span>
                        <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: Boolean(entity.configuration.hasIndex) ? 'var(--emerald)' : 'var(--rose)' }}>
                          {Boolean(entity.configuration.hasIndex) ? '3ms (Optimal)' : '850ms (Seq Scan)'}
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Active Query:</span>
                        <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--amber)', fontSize: '10px' }}>SELECT * FROM orders...</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Redis In-Memory Cache Profile */}
                {isRedis && (
                  <div
                    className="metric-card"
                    style={{
                      border: '1px solid rgba(239, 68, 68, 0.4)',
                    }}
                  >
                    <div className="metric-card-top">
                      <div className="metric-card-title">
                        <Zap size={14} color="#ef4444" />
                        <span>In-Memory Cache Profile</span>
                      </div>
                      <span
                        className="health-pill health-healthy"
                        style={{ padding: '2px 6px', fontSize: '10px', minWidth: 'unset', color: '#ef4444' }}
                      >
                        RAM STORAGE
                      </span>
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px',
                        fontSize: '11px',
                        marginTop: '6px',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Hit Ratio:</span>
                        <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#10b981' }}>
                          {Math.round(((entity.configuration.cacheHitRatio as number) || 0.9) * 100)}%
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Cached Keys:</span>
                        <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>
                          {String(entity.configuration.cachedKeysCount || '1,420')} items
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Eviction Policy:</span>
                        <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--cyan)' }}>
                          {String(entity.configuration.evictionPolicy || 'volatile-lru')}
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Read Latency:</span>
                        <span style={{ fontFamily: 'var(--font-mono)', color: '#10b981', fontWeight: 600 }}>
                          1ms (RAM)
                        </span>
                      </div>
                    </div>
                  </div>
                )}
                {/* Job Queue Backlog Profile */}
                {isQueue && (
                  <div className="metric-card" style={{ border: '1px solid rgba(249, 115, 22, 0.4)' }}>
                    <div className="metric-card-top">
                      <div className="metric-card-title">
                        <Layers size={14} color="#f97316" />
                        <span>Job Queue Backlog</span>
                      </div>
                      <span
                        className={`health-pill ${Number(entity.configuration.pendingJobs ?? 0) > 100 ? 'health-failing' : 'health-healthy'}`}
                        style={{ padding: '2px 6px', fontSize: '10px', minWidth: 'unset' }}
                      >
                        {Boolean(entity.configuration.pendingJobs) ? `${Number(entity.configuration.pendingJobs)} PENDING` : 'DRAINING'}
                      </span>
                    </div>
                    <p style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: '1.6', marginTop: '6px' }}>
                      Buffers slow background jobs so the API can respond instantly with 202 Accepted. A backlog that only
                      grows means there are no (or too few) workers consuming it.
                    </p>
                  </div>
                )}

                {/* Async Worker Profile */}
                {isWorker && (
                  <div className="metric-card" style={{ border: '1px solid rgba(249, 115, 22, 0.4)' }}>
                    <div className="metric-card-top">
                      <div className="metric-card-title">
                        <Cpu size={14} color="#f97316" />
                        <span>Background Worker</span>
                      </div>
                      <span className="health-pill health-healthy" style={{ padding: '2px 6px', fontSize: '10px', minWidth: 'unset' }}>
                        CONCURRENCY {String(entity.configuration.concurrency ?? 16)}
                      </span>
                    </div>
                    <p style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: '1.6', marginTop: '6px' }}>
                      Consumes jobs from the queue outside the request path. Add more workers to drain a backlog faster —
                      without ever touching the API.
                    </p>
                  </div>
                )}
              </div>
            ) : isPooler ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div className="metric-card">
                  <div className="metric-card-title" style={{ color: 'var(--cyan)', fontWeight: 600 }}>
                    <Layers size={14} />
                    <span>Connection Multiplexer</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '11px', marginTop: '6px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Pool Mode:</span>
                      <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--emerald)' }}>transaction</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Server Connections:</span>
                      <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>8 persistent</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Max Client Sockets:</span>
                      <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>500 clients</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="metric-card">
                <div className="metric-card-title" style={{ color: 'var(--cyan)', fontWeight: 600 }}>
                  <Activity size={14} />
                  <span>User Traffic Agent</span>
                </div>
                <p style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: '1.6' }}>
                  Represents aggregated browser clients requesting static HTML, CSS, images, and script assets.
                </p>
              </div>
            )}
          </>
        )}

        {activeTab === 'config' && (
          <div className="config-list">
            {Object.entries(entity.configuration).map(([key, val]) => (
              <div key={key} className="config-item">
                <span className="config-key">{key}:</span>
                <span className="config-val">{String(val)}</span>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'logs' && (
          <div className="config-list" style={{ maxHeight: '200px', overflowY: 'auto' }}>
            {snapshot.events
              .filter((e) => !e.entityId || e.entityId === entity.id)
              .slice(-10)
              .map((e) => (
                <div key={e.id} style={{ display: 'flex', gap: '8px', padding: '3px 0' }}>
                  <span style={{ color: 'var(--cyan)' }}>[{e.simTimeFormatted}]</span>
                  <span style={{ color: e.level === 'error' ? 'var(--rose)' : e.level === 'warn' ? 'var(--amber)' : 'var(--text-secondary)' }}>
                    {e.message}
                  </span>
                </div>
              ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="inspector-footer">
        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Terminal size={12} color="var(--cyan)" />
          <span>Drag nodes to rearrange • scroll to zoom • Space to pause</span>
        </span>
      </div>
    </aside>
  );
};
