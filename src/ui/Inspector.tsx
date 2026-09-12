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

  return (
    <aside className="absolute top-16 right-4 bottom-24 w-84 md:w-96 bg-slate-900/90 backdrop-blur-xl border border-slate-800/90 rounded-xl shadow-2xl z-20 flex flex-col overflow-hidden select-none animate-in slide-in-from-right duration-200">
      {/* Header */}
      <div className="p-4 border-b border-slate-800/80 flex items-center justify-between bg-slate-950/40">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-sky-400">
            {isServer ? <Server size={16} /> : <Users size={16} />}
          </div>
          <div>
            <h2 className="text-sm font-semibold text-slate-100 leading-none">{entity.name}</h2>
            <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">{entity.id}</span>
          </div>
        </div>

        <button
          onClick={() => setSelectedEntityId(null)}
          className="p-1 rounded-md text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
          title="Close Inspector"
        >
          <X size={16} />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-800/80 bg-slate-950/20 text-xs font-medium">
        <button
          onClick={() => setActiveTab('metrics')}
          className={`flex-1 py-2.5 text-center border-b-2 transition-colors ${
            activeTab === 'metrics'
              ? 'border-sky-400 text-sky-300 font-semibold bg-sky-500/10'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Metrics
        </button>
        <button
          onClick={() => setActiveTab('config')}
          className={`flex-1 py-2.5 text-center border-b-2 transition-colors ${
            activeTab === 'config'
              ? 'border-sky-400 text-sky-300 font-semibold bg-sky-500/10'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Config
        </button>
        <button
          onClick={() => setActiveTab('logs')}
          className={`flex-1 py-2.5 text-center border-b-2 transition-colors ${
            activeTab === 'logs'
              ? 'border-sky-400 text-sky-300 font-semibold bg-sky-500/10'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Logs
        </button>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
        {/* Status Badge */}
        <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950/60 border border-slate-800">
          <span className="text-slate-400">Health State:</span>
          <span className={`font-mono font-semibold px-2 py-0.5 rounded text-[11px] ${
            entity.status === 'HEALTHY'
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
              : entity.status === 'DEGRADED'
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
              : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
          }`}>
            {entity.status}
          </span>
        </div>

        {activeTab === 'metrics' && (
          <>
            {isServer ? (
              <div className="space-y-3.5">
                {/* CPU Meter */}
                <div className="p-3 rounded-lg bg-slate-950/50 border border-slate-800/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-slate-300 font-medium">
                      <Cpu size={14} className="text-sky-400" />
                      <span>CPU Utilization</span>
                    </div>
                    <span className="font-mono font-bold text-slate-100">{cpuPct}%</span>
                  </div>
                  <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 rounded-full ${
                        cpuPct > 85 ? 'bg-rose-500' : cpuPct > 70 ? 'bg-amber-500' : 'bg-sky-400'
                      }`}
                      style={{ width: `${Math.min(100, cpuPct)}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                    <span>{entity.resources.cpu.usedCores} Cores used</span>
                    <span>{entity.resources.cpu.capacityCores} Cores Total</span>
                  </div>
                </div>

                {/* Memory Meter */}
                <div className="p-3 rounded-lg bg-slate-950/50 border border-slate-800/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-slate-300 font-medium">
                      <HardDrive size={14} className="text-emerald-400" />
                      <span>Memory (RAM)</span>
                    </div>
                    <span className="font-mono font-bold text-slate-100">{memPct}%</span>
                  </div>
                  <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-400 transition-all duration-300 rounded-full"
                      style={{ width: `${Math.min(100, memPct)}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                    <span>{entity.resources.memory.usedMb} MB used</span>
                    <span>{entity.resources.memory.capacityMb} MB Total</span>
                  </div>
                </div>

                {/* Connection Pool */}
                <div className="p-3 rounded-lg bg-slate-950/50 border border-slate-800/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-slate-300 font-medium">
                      <Wifi size={14} className="text-purple-400" />
                      <span>Connection Pool</span>
                    </div>
                    <span className="font-mono font-bold text-slate-100">{connPct}%</span>
                  </div>
                  <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-purple-400 transition-all duration-300 rounded-full"
                      style={{ width: `${Math.min(100, connPct)}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                    <span>{entity.resources.connections.current} Active Connections</span>
                    <span>{entity.resources.connections.max} Max Capacity</span>
                  </div>
                </div>

                {/* Monthly Cost */}
                <div className="p-3 rounded-lg bg-slate-950/50 border border-slate-800/80 flex items-center justify-between">
                  <span className="text-slate-400">Simulated Cost</span>
                  <span className="font-mono font-bold text-emerald-400">${entity.costMonthly.toFixed(2)} / month</span>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="p-3 rounded-lg bg-slate-950/50 border border-slate-800/80 space-y-2 text-slate-300">
                  <div className="flex items-center gap-1.5 font-medium text-sky-400">
                    <Activity size={14} />
                    <span>User Traffic Agent</span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Represents aggregated browser users requesting static HTML, CSS, images, and script assets.
                  </p>
                </div>
              </div>
            )}
          </>
        )}

        {activeTab === 'config' && (
          <div className="p-3 rounded-lg bg-slate-950/50 border border-slate-800/80 space-y-2 font-mono text-[11px]">
            {Object.entries(entity.configuration).map(([key, val]) => (
              <div key={key} className="flex items-center justify-between border-b border-slate-800/50 pb-1">
                <span className="text-slate-400">{key}:</span>
                <span className="text-slate-200">{String(val)}</span>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'logs' && (
          <div className="p-2 rounded-lg bg-slate-950 border border-slate-800 font-mono text-[10px] space-y-1.5 max-h-60 overflow-y-auto">
            {snapshot.events
              .filter((e) => !e.entityId || e.entityId === entity.id)
              .slice(-10)
              .map((e) => (
                <div key={e.id} className="text-slate-400">
                  <span className="text-sky-400">[{e.simTimeFormatted}]</span>{' '}
                  <span className={e.level === 'error' ? 'text-rose-400' : e.level === 'warn' ? 'text-amber-400' : 'text-slate-300'}>
                    {e.message}
                  </span>
                </div>
              ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-slate-800/80 bg-slate-950/60 flex items-center justify-between text-[11px] text-slate-400">
        <span className="flex items-center gap-1">
          <Terminal size={12} className="text-sky-400" />
          <span>Coordinates:</span>
        </span>
        <span className="font-mono text-slate-200">
          x: {entity.position.x}, y: {entity.position.y}
        </span>
      </div>
    </aside>
  );
};
