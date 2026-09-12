import React from 'react';
import { staticSiteScenario } from '../scenarios/staticSiteScenario';
import { X, ArrowUpRight, Check, AlertCircle, Zap, Server, Network } from 'lucide-react';

interface SolutionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectSolution: (solutionId: string) => void;
}

export const SolutionModal: React.FC<SolutionModalProps> = ({ isOpen, onClose, onSelectSolution }) => {
  if (!isOpen) return null;

  const solutions = staticSiteScenario.availableSolutions;

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'vertical':
        return <ArrowUpRight size={16} color="var(--cyan)" />;
      case 'cdn':
        return <Zap size={16} color="#c084fc" />;
      case 'horizontal':
        return <Network size={16} color="#34d399" />;
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
            <h2 className="modal-title">Origin Server Saturated Under Traffic Surge</h2>
            <p className="modal-desc">
              Traffic surged from 6 to 38+ req/s. Single Nginx host CPU exceeded 85% and socket connections are dropping. Select an architectural solution to stabilize the system:
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
                <div className="points-label positive">Trade-off Advantages</div>
                {sol.pros.map((pro, i) => (
                  <div key={i} className="point-row">
                    <Check size={12} className="point-icon positive" />
                    <span>{pro}</span>
                  </div>
                ))}
              </div>

              {/* Cons */}
              <div className="points-group">
                <div className="points-label negative">Trade-off Drawbacks</div>
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
