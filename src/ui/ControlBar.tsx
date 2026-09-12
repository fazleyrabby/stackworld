import React, { useEffect } from 'react';
import { SimulationEngine } from '../engine/SimulationEngine';
import { SimulationSnapshot } from '../shared/types';
import { Play, Pause, StepForward, Flame } from 'lucide-react';

interface ControlBarProps {
  engine: SimulationEngine;
  snapshot: SimulationSnapshot;
}

export const ControlBar: React.FC<ControlBarProps> = ({ engine, snapshot }) => {
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
    <footer className="control-bar">
      {/* Play / Pause Toggle */}
      <button
        onClick={() => engine.togglePause()}
        title={snapshot.isPaused ? 'Resume Simulation (Space)' : 'Pause Simulation (Space)'}
        className={`btn-play-toggle ${snapshot.isPaused ? 'paused' : 'playing'}`}
      >
        {snapshot.isPaused ? <Play size={17} fill="currentColor" /> : <Pause size={17} fill="currentColor" />}
      </button>

      {/* Step Tick Button */}
      <button
        onClick={() => engine.step()}
        disabled={!snapshot.isPaused}
        title="Step One Tick (50ms) — active when paused"
        className="btn-step-tick"
      >
        <StepForward size={15} />
      </button>

      <div className="control-divider" />

      {/* Speed Multipliers */}
      <div className="speed-group">
        {speeds.map((s) => (
          <button
            key={s}
            onClick={() => engine.setSpeed(s)}
            className={`btn-speed ${snapshot.speedMultiplier === s ? 'active' : ''}`}
          >
            {s}×
          </button>
        ))}
      </div>

      <div className="control-divider" />

      {/* Traffic Knob */}
      <div className="traffic-control">
        <span>Traffic:</span>
        <button
          onClick={() => engine.setTargetRps(Math.max(1, engine.getTargetRps() - 2))}
          className="btn-knob"
          title="Decrease Traffic"
        >
          -
        </button>
        <span className="traffic-display">
          {engine.getTargetRps()} <span style={{ fontSize: '9px', color: 'var(--text-muted)' }}>rps</span>
        </span>
        <button
          onClick={() => engine.setTargetRps(engine.getTargetRps() + 5)}
          className="btn-knob"
          title="Increase Traffic"
        >
          +
        </button>
      </div>

      {/* Inject Traffic Burst Spike */}
      <button
        onClick={() => engine.injectSpike(30)}
        title="Simulate sudden traffic spike (+30 concurrent requests) to test degradation"
        className="btn-spike"
      >
        <Flame size={14} color="#fb923c" />
        <span>Inject Spike</span>
      </button>
    </footer>
  );
};
