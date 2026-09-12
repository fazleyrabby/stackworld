import React from 'react';
import { SimulationSnapshot } from '../shared/types';
import { useUiStore } from '../state/useUiStore';
import { X, Server, Users, Cpu, HardDrive, Wifi, Activity, Terminal } from 'lucide-react';

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

  const isServer = entity.type === 'static_host' || entity.type === 'server';

  const cpuPct = Math.round(entity.resources.cpu.utilizationPct);
  const memPct = Math.round(entity.resources.memory.utilizationPct);
  const connPct = Math.round((entity.resources.connections.current / entity.resources.connections.max) * 100);

  const getMeterColor = (pct: number) => {
    if (pct >= 85) return 'var(--rose)';
    if (pct >= 70) return 'var(--amber)';
    return 'var(--cyan)';
  };

  return (
    <aside className="inspector-panel">
      {/* Header */}
      <div className="inspector-header">
        <div className="inspector-header-left">
          <div className="node-icon-box">
            {isServer ? <Server size={16} /> : <Users size={16} />}
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
          <span>Coordinates:</span>
        </span>
        <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>
          x: {entity.position.x}, y: {entity.position.y}
        </span>
      </div>
    </aside>
  );
};
