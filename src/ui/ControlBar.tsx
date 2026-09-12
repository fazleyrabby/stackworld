import React, { useEffect } from 'react';
import { SimulationEngine } from '../engine/SimulationEngine';
import { SimulationSnapshot } from '../shared/types';
import { Play, Pause, StepForward, Flame } from 'lucide-react';

interface ControlBarProps {
  engine: SimulationEngine;
  snapshot: SimulationSnapshot;
}

export const ControlBar: React.FC<ControlBarProps> = ({ engine, snapshot }) => {
  // Keyboard spacebar shortcut for play/pause
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && e.target === document.body) {
        e.preventDefault();
        engine.togglePause();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [engine]);

  const speeds = [0.5, 1, 2, 5];

  return (
    <footer className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-3 p-2 px-4 rounded-xl bg-slate-900/90 backdrop-blur-xl border border-slate-800/90 shadow-2xl z-20 select-none">
      {/* Play / Pause Toggle */}
      <button
        onClick={() => engine.togglePause()}
        title={snapshot.isPaused ? 'Resume Simulation (Space)' : 'Pause Simulation (Space)'}
        className={`flex items-center justify-center w-9 h-9 rounded-lg font-bold transition-all shadow-md ${
          snapshot.isPaused
            ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/20'
            : 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-500/20'
        }`}
      >
        {snapshot.isPaused ? <Play size={18} fill="currentColor" /> : <Pause size={18} fill="currentColor" />}
      </button>

      {/* Step Tick Button */}
      <button
        onClick={() => engine.step()}
        disabled={!snapshot.isPaused}
        title="Step One Tick (50ms) — works when paused"
        className="flex items-center justify-center w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:hover:bg-slate-800 text-slate-200 transition-colors"
      >
        <StepForward size={16} />
      </button>

      <div className="w-[1px] h-6 bg-slate-800 mx-1" />

      {/* Speed Multipliers */}
      <div className="flex items-center gap-1 bg-slate-950/60 p-1 rounded-lg border border-slate-800">
        {speeds.map((s) => (
          <button
            key={s}
            onClick={() => engine.setSpeed(s)}
            className={`px-2.5 py-1 rounded text-xs font-mono font-semibold transition-all ${
              snapshot.speedMultiplier === s
                ? 'bg-sky-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            {s}×
          </button>
        ))}
      </div>

      <div className="w-[1px] h-6 bg-slate-800 mx-1" />

      {/* Target RPS Knob */}
      <div className="flex items-center gap-2 px-2 text-xs font-mono">
        <span className="text-slate-400 hidden sm:inline">Traffic:</span>
        <button
          onClick={() => engine.setTargetRps(Math.max(1, engine.getTargetRps() - 2))}
          className="w-6 h-6 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center font-bold"
        >
          -
        </button>
        <span className="min-w-[44px] text-center font-bold text-sky-400">
          {engine.getTargetRps()} <span className="text-[10px] text-slate-500">rps</span>
        </span>
        <button
          onClick={() => engine.setTargetRps(engine.getTargetRps() + 5)}
          className="w-6 h-6 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center font-bold"
        >
          +
        </button>
      </div>

      {/* Inject Traffic Burst Spike */}
      <button
        onClick={() => engine.injectSpike(30)}
        title="Simulate sudden traffic spike (+30 concurrent requests) to test degradation"
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-orange-500/20 to-rose-500/20 border border-orange-500/40 hover:border-orange-500 text-orange-300 hover:text-orange-200 text-xs font-semibold transition-all shadow-md active:scale-95"
      >
        <Flame size={14} className="text-orange-400" />
        <span className="hidden sm:inline">Inject</span> Spike
      </button>
    </footer>
  );
};
