import { useEffect, useMemo, useState } from 'react';
import { SimulationEngine } from './engine/SimulationEngine';
import { SimulationSnapshot } from './shared/types';
import { WorldViewport } from './world/WorldViewport';
import { TopBar } from './ui/TopBar';
import { Inspector } from './ui/Inspector';
import { ControlBar } from './ui/ControlBar';
import { EventLog } from './ui/EventLog';

export function App() {
  // Create single engine instance
  const engine = useMemo(() => new SimulationEngine({ initialRps: 6 }), []);
  const [snapshot, setSnapshot] = useState<SimulationSnapshot>(() => engine.getSnapshot());

  useEffect(() => {
    // Start simulation clock
    engine.start();

    // Subscribe to engine state changes (at 20Hz)
    const unsubscribe = engine.subscribe((newSnapshot) => {
      setSnapshot(newSnapshot);
    });

    return () => {
      unsubscribe();
      engine.stop();
    };
  }, [engine]);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-slate-950 font-sans text-slate-100">
      {/* 2D Canvas Simulation World */}
      <WorldViewport engine={engine} />

      {/* Top HUD Bar */}
      <TopBar snapshot={snapshot} />

      {/* Slide-over Inspector for Selected Node */}
      <Inspector snapshot={snapshot} />

      {/* Playback and Traffic Control Bar */}
      <ControlBar engine={engine} snapshot={snapshot} />

      {/* Collapsible Infrastructure Event Log */}
      <EventLog snapshot={snapshot} />
    </div>
  );
}

export default App;
