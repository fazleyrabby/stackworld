import React from 'react';
import { SimulationSnapshot } from '../shared/types';
import { Target, CheckCircle2, AlertTriangle, ShieldCheck } from 'lucide-react';

interface ObjectiveTrackerProps {
  snapshot: SimulationSnapshot;
  onOpenSolutions: () => void;
}

export const ObjectiveTracker: React.FC<ObjectiveTrackerProps> = ({ snapshot, onOpenSolutions }) => {
  // Read stages from the ACTIVE scenario (snapshot.scenario), not a hardcoded one.
  const scenario = snapshot.scenario;
  const stage = scenario.stages.find(
    (s) => s.id === snapshot.scenarioState.currentStageId
  ) || scenario.stages[0];

  const isDegraded = snapshot.scenarioState.currentStageId === 'stage_degraded';
  const isVerifying = snapshot.scenarioState.currentStageId === 'stage_solution_applied';
  const isVictory = snapshot.scenarioState.currentStageId === 'stage_victory';

  const requiredSeconds = scenario.successConditions.minSustainedSeconds;
  const sustainedSeconds = Math.min(requiredSeconds, Math.round(snapshot.scenarioState.sustainedHealthySeconds));

  return (
    <div className="objective-bar">
      <div className="objective-left">
        <div className={`objective-icon-box ${isDegraded ? 'degraded' : isVictory ? 'victory' : ''}`}>
          {isVictory ? (
            <CheckCircle2 size={14} color="#10b981" />
          ) : isDegraded ? (
            <AlertTriangle size={14} color="#fb923c" />
          ) : (
            <Target size={14} color="var(--cyan)" />
          )}
        </div>
        <div className="objective-text">
          <div className="objective-title">{scenario.title} — {stage.title}</div>
          <div className="objective-desc">{stage.instructions}</div>
        </div>
      </div>

      <div className="objective-right">
        {isVerifying && (
          <div className="progress-pill">
            <ShieldCheck size={13} color="#10b981" />
            <span>Sustained:</span>
            <span className="progress-num font-mono">{sustainedSeconds}s / {requiredSeconds}s</span>
          </div>
        )}

        {isDegraded && (
          <button onClick={onOpenSolutions} className="btn-resolve-alert">
            ⚠️ Fix The Incident — Choose Architecture
          </button>
        )}
      </div>
    </div>
  );
};
