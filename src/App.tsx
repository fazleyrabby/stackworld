import { useEffect, useMemo, useState } from 'react';
import { SimulationEngine } from './engine/SimulationEngine';
import { SimulationSnapshot } from './shared/types';
import { WorldViewport } from './world/WorldViewport';
import { TopBar } from './ui/TopBar';
import { Inspector } from './ui/Inspector';
import { ControlBar } from './ui/ControlBar';
import { EventLog } from './ui/EventLog';
import { ObjectiveTracker } from './ui/ObjectiveTracker';
import { SolutionModal } from './ui/SolutionModal';
import { VictoryModal } from './ui/VictoryModal';
import { CoachOverlay } from './ui/CoachOverlay';
import { useUiStore } from './state/useUiStore';

export function App() {
  const engine = useMemo(() => new SimulationEngine({ initialRps: 6 }), []);
  const [snapshot, setSnapshot] = useState<SimulationSnapshot>(() => engine.getSnapshot());
  const [activeScenarioId, setActiveScenarioId] = useState<string>(
    () => engine.getActiveScenario().id
  );
  const setSelectedEntityId = useUiStore((state) => state.setSelectedEntityId);

  useEffect(() => {
    engine.start();

    const unsubscribe = engine.subscribe((newSnapshot) => {
      setSnapshot(newSnapshot);
    });

    return () => {
      unsubscribe();
      engine.stop();
    };
  }, [engine]);

  const handleSelectScenario = (scenarioId: string) => {
    setActiveScenarioId(scenarioId);
    engine.loadScenario(scenarioId);
    // Old selection no longer exists in the new topology; clear Inspector noise.
    setSelectedEntityId(null);
  };

  return (
    <div className="app-container">
      {/* 2D Canvas Simulation World */}
      <WorldViewport engine={engine} />

      {/* Top HUD Bar */}
      <TopBar
        snapshot={snapshot}
        activeScenarioId={activeScenarioId}
        onSelectScenario={handleSelectScenario}
      />

      {/* Mission / Objective Tracker Bar */}
      <ObjectiveTracker
        snapshot={snapshot}
        onOpenSolutions={() => engine.openSolutionModal()}
      />

      {/* Slide-over Inspector for Selected Node */}
      <Inspector snapshot={snapshot} />

      {/* Playback and Traffic Control Bar */}
      <ControlBar engine={engine} snapshot={snapshot} />

      {/* Collapsible Infrastructure Event Log */}
      <EventLog snapshot={snapshot} />

      {/* Incident Diagnosis & Solution Choice Modal */}
      <SolutionModal
        isOpen={snapshot.scenarioState.isSolutionModalOpen}
        scenario={snapshot.scenario}
        onClose={() => engine.closeSolutionModal()}
        onSelectSolution={(solId) => engine.applySolution(solId)}
      />

      {/* Scenario Completion Victory Modal */}
      <VictoryModal
        isOpen={snapshot.scenarioState.isVictoryModalOpen}
        scenarioState={snapshot.scenarioState}
        onClose={() => engine.closeVictoryModal()}
      />

      {/* First-run "How to read this world" onboarding guide */}
      <CoachOverlay />
    </div>
  );
}

export default App;
