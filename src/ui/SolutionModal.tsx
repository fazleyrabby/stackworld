import React from 'react';
import { ScenarioDefinition } from '../scenarios/types';
import { X, ArrowUpRight, Check, AlertCircle, Zap, Server, Network, Layers } from 'lucide-react';

interface SolutionModalProps {
  isOpen: boolean;
  scenario: ScenarioDefinition;
  onClose: () => void;
  onSelectSolution: (solutionId: string) => void;
}

export const SolutionModal: React.FC<SolutionModalProps> = ({ isOpen, scenario, onClose, onSelectSolution }) => {
  if (!isOpen) return null;

  // Solutions and incident framing come from the ACTIVE scenario definition.
  const solutions = scenario.availableSolutions;
  const degradedStage = scenario.stages.find((s) => s.id === 'stage_degraded');

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'vertical':
        return <ArrowUpRight size={16} color="var(--cyan)" />;
      case 'cdn':
        return <Zap size={16} color="#c084fc" />;
      case 'horizontal':
        return <Network size={16} color="#34d399" />;
      case 'cache':
        return <Zap size={16} color="#ef4444" />;
      case 'queue':
        return <Layers size={16} color="#f97316" />;
      default:
        return <Server size={16} />;
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="solution-modal">
        {/* Modal Header */}
        <div className="modal-header">
          <div>
            <div className="modal-alert-tag">
              <AlertCircle size={13} />
              <span>INCIDENT DIAGNOSIS</span>
            </div>
            <h2 className="modal-title">{degradedStage ? degradedStage.title.replace(/^\d+\.\s*/, '') : scenario.title}</h2>
            <p className="modal-desc">
              {degradedStage
                ? degradedStage.instructions
                : 'Select an architectural solution to stabilize the system:'}
            </p>
            <p className="modal-hint">
              There is no single “correct” answer — each option trades money, reliability, and simplicity differently. Read the trade-offs, pick one, then watch how the world reacts.
            </p>
          </div>
          <button onClick={onClose} className="inspector-close-btn" title="Close Dialog">
            <X size={18} />
          </button>
        </div>

        {/* 3 Solution Columns */}
        <div className="solutions-grid">
          {solutions.map((sol) => (
            <div key={sol.id} className="solution-card">
              <div className="solution-card-header">
                <div className="solution-icon-box">{getCategoryIcon(sol.category)}</div>
                <div>
                  <h3 className="solution-name">{sol.name}</h3>
                  <div className="solution-cost">+${sol.costMonthlyDelta.toFixed(2)} / month</div>
                </div>
              </div>

              <p className="solution-description">{sol.description}</p>

              <div className="badge-row">
                <span className="spec-badge">Complexity: {sol.complexity}</span>
                <span className="spec-badge">Reliability: {sol.reliability}</span>
              </div>

              {/* Pros */}
              <div className="points-group">
                <div className="points-label positive">What you gain</div>
                {sol.pros.map((pro, i) => (
                  <div key={i} className="point-row">
                    <Check size={12} className="point-icon positive" />
                    <span>{pro}</span>
                  </div>
                ))}
              </div>

              {/* Cons */}
              <div className="points-group">
                <div className="points-label negative">What it costs you</div>
                {sol.cons.map((con, i) => (
                  <div key={i} className="point-row">
                    <span className="point-icon negative">•</span>
                    <span>{con}</span>
                  </div>
                ))}
              </div>

              {/* Action Button */}
              <button
                onClick={() => onSelectSolution(sol.id)}
                className="btn-deploy-solution"
              >
                Deploy Solution
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
