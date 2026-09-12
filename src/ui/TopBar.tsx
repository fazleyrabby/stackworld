import React from 'react';
import { SimulationSnapshot, HealthStatus } from '../shared/types';
import { Activity, Bell, DollarSign, Globe, Layers } from 'lucide-react';
import { useUiStore } from '../state/useUiStore';

interface TopBarProps {
  snapshot: SimulationSnapshot;
}

export const TopBar: React.FC<TopBarProps> = ({ snapshot }) => {
  const toggleEventLog = useUiStore((state) => state.toggleEventLog);
  const isEventLogOpen = useUiStore((state) => state.isEventLogOpen);

  const formatSimTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
    const secs = Math.floor(seconds % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
  };

  const getHealthBadgeStyle = (status: HealthStatus) => {
    switch (status) {
      case 'HEALTHY':
        return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
      case 'DEGRADED':
        return 'bg-amber-500/15 text-amber-400 border-amber-500/30';
      case 'OVERLOADED':
        return 'bg-orange-500/15 text-orange-400 border-orange-500/30';
      case 'FAILING':
      case 'DOWN':
        return 'bg-rose-500/15 text-rose-400 border-rose-500/30';
      default:
        return 'bg-sky-500/15 text-sky-400 border-sky-500/30';
    }
  };

  return (
    <header className="absolute top-0 left-0 right-0 h-14 bg-slate-900/85 backdrop-blur-md border-b border-slate-800/80 px-4 flex items-center justify-between z-30 shadow-lg select-none">
      {/* Left: Brand & Scenario */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-sky-500/20 border border-sky-400/40 flex items-center justify-center text-sky-400 font-black shadow-[0_0_12px_rgba(56,189,248,0.3)]">
            ⚡
          </div>
          <span className="font-bold text-base tracking-wider text-slate-100 font-['Outfit']">
            STACK<span className="text-sky-400">WORLD</span>
          </span>
        </div>

        <div className="h-5 w-[1px] bg-slate-800 mx-1 hidden sm:block" />

        <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-md bg-slate-800/60 border border-slate-700/60 text-xs">
          <Layers size={13} className="text-sky-400" />
          <span className="text-slate-400 font-medium">Scenario:</span>
          <span className="text-slate-200 font-semibold">Phase 1 — Static Host</span>
        </div>
      </div>

      {/* Center: System Telemetry */}
      <div className="flex items-center gap-4">
        {/* Sim Clock */}
        <div className="flex items-center gap-2 px-3 py-1 rounded-md bg-slate-950/70 border border-slate-800 font-mono text-xs">
          <span className="relative flex h-2 w-2">
            {!snapshot.isPaused && (
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
            )}
            <span className={`relative inline-flex rounded-full h-2 w-2 ${snapshot.isPaused ? 'bg-amber-400' : 'bg-sky-400'}`}></span>
          </span>
          <span className="text-slate-400">SIM TIME</span>
          <span className="text-sky-400 font-bold">{formatSimTime(snapshot.timeSeconds)}</span>
        </div>

        {/* Global Cluster Health */}
        <div className={`flex items-center gap-1.5 px-3 py-1 rounded-md border text-xs font-semibold uppercase tracking-wider ${getHealthBadgeStyle(snapshot.metrics.clusterHealth)}`}>
          <Activity size={13} />
          <span>{snapshot.metrics.clusterHealth}</span>
        </div>

        {/* Requests Telemetry */}
        <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded-md bg-slate-950/70 border border-slate-800 font-mono text-xs">
          <Globe size={13} className="text-slate-400" />
          <span className="text-slate-400">RPS:</span>
          <span className="text-emerald-400 font-bold">{snapshot.metrics.currentRps}</span>
          <span className="text-slate-600">|</span>
          <span className="text-slate-400">TOTAL:</span>
          <span className="text-slate-200">{snapshot.metrics.requestsTotal}</span>
        </div>
      </div>

      {/* Right: Budget & Event Log Toggle */}
      <div className="flex items-center gap-3">
        <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-950/70 border border-slate-800 text-xs font-mono">
          <DollarSign size={13} className="text-emerald-400" />
          <span className="text-slate-400">Budget:</span>
          <span className="text-emerald-400 font-bold">${snapshot.metrics.monthlyCost.toFixed(2)}</span>
          <span className="text-slate-500">/ $20.00</span>
        </div>

        <button
          onClick={toggleEventLog}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
            isEventLogOpen
              ? 'bg-sky-500/20 border-sky-400/50 text-sky-300'
              : 'bg-slate-800/80 hover:bg-slate-800 border-slate-700 text-slate-300'
          }`}
        >
          <Bell size={13} />
          <span className="hidden sm:inline">Events</span>
          {snapshot.events.length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-sky-500/30 text-sky-300 text-[10px] font-mono">
              {snapshot.events.length}
            </span>
          )}
        </button>
      </div>
    </header>
  );
};
