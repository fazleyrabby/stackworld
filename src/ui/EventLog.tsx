import React from 'react';
import { SimulationSnapshot, SimulationEvent } from '../shared/types';
import { useUiStore } from '../state/useUiStore';
import { X, AlertCircle, Info, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface EventLogProps {
  snapshot: SimulationSnapshot;
}

export const EventLog: React.FC<EventLogProps> = ({ snapshot }) => {
  const isEventLogOpen = useUiStore((state) => state.isEventLogOpen);
  const setEventLogOpen = useUiStore((state) => state.setEventLogOpen);

  if (!isEventLogOpen) return null;

  const getEventIcon = (level: SimulationEvent['level']) => {
    switch (level) {
      case 'info':
        return <Info size={13} className="text-sky-400" />;
      case 'warn':
        return <AlertTriangle size={13} className="text-amber-400" />;
      case 'error':
        return <AlertCircle size={13} className="text-rose-400" />;
      case 'success':
        return <CheckCircle2 size={13} className="text-emerald-400" />;
    }
  };

  const getEventBadge = (level: SimulationEvent['level']) => {
    switch (level) {
      case 'info':
        return 'text-sky-400 bg-sky-500/10 border-sky-500/20';
      case 'warn':
        return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
      case 'error':
        return 'text-rose-400 bg-rose-500/10 border-rose-500/20';
      case 'success':
        return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
    }
  };

  return (
    <aside className="absolute bottom-20 left-6 right-6 md:left-24 md:right-96 max-h-56 bg-slate-900/95 backdrop-blur-xl border border-slate-800 rounded-xl shadow-2xl z-20 flex flex-col overflow-hidden select-none animate-in slide-in-from-bottom duration-200">
      {/* Header */}
      <div className="p-3 px-4 border-b border-slate-800/80 flex items-center justify-between bg-slate-950/50">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-200 uppercase tracking-wider font-['Outfit']">
            Infrastructure Event Log
          </span>
          <span className="text-[11px] font-mono text-slate-500">
            ({snapshot.events.length} entries)
          </span>
        </div>
        <button
          onClick={() => setEventLogOpen(false)}
          className="text-slate-400 hover:text-slate-100 p-1 rounded hover:bg-slate-800 transition-colors"
        >
          <X size={15} />
        </button>
      </div>

      {/* Log Stream */}
      <div className="flex-1 overflow-y-auto p-3 space-y-1.5 font-mono text-xs">
        {snapshot.events.length === 0 ? (
          <p className="text-slate-500 text-center py-4">No events recorded yet.</p>
        ) : (
          [...snapshot.events].reverse().map((e) => (
            <div
              key={e.id}
              className="flex items-start gap-2.5 p-1.5 rounded hover:bg-slate-800/50 transition-colors"
            >
              <span className="text-[10px] text-slate-500 min-w-[42px] pt-0.5">
                {e.simTimeFormatted}
              </span>
              <span
                className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold border ${getEventBadge(
                  e.level
                )}`}
              >
                {getEventIcon(e.level)}
                {e.level.toUpperCase()}
              </span>
              <span className="text-slate-300 flex-1 text-[11px]">{e.message}</span>
            </div>
          ))
        )}
      </div>
    </aside>
  );
};
