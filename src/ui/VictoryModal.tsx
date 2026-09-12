import React from 'react';
import { ScenarioState } from '../scenarios/types';
import { Trophy, CheckCircle2, Shield, DollarSign, Layers } from 'lucide-react';

interface VictoryModalProps {
  isOpen: boolean;
  scenarioState: ScenarioState;
  onClose: () => void;
}

export const VictoryModal: React.FC<VictoryModalProps> = ({ isOpen, scenarioState, onClose }) => {
  if (!isOpen || !scenarioState.score) return null;

  const score = scenarioState.score;

  return (
    <div className="modal-backdrop">
      <div className="victory-modal">
        <div className="victory-badge-box">
          <Trophy size={32} color="#fbbf24" />
        </div>

        <h2 className="victory-title">Scenario Complete!</h2>
        <p className="victory-desc">
          Your infrastructure successfully sustained the traffic surge with high uptime and low latency.
        </p>

        {/* Grade Card */}
        <div className="grade-card">
          <div className="grade-letter">{score.grade}</div>
          <div className="grade-meta">
            <div className="grade-title">Architecture Grade: {score.grade} Tier</div>
            <div className="grade-summary">{score.summary}</div>
          </div>
        </div>

        {/* Score Breakdown */}
        <div className="score-grid">
          <div className="score-box">
            <div className="score-box-top">
              <Shield size={14} color="#34d399" />
              <span>Reliability</span>
            </div>
            <div className="score-box-val">{score.reliabilityScore} / 100</div>
          </div>

          <div className="score-box">
            <div className="score-box-top">
              <DollarSign size={14} color="#38bdf8" />
              <span>Cost Efficiency</span>
            </div>
            <div className="score-box-val">{score.costEfficiencyScore} / 100</div>
          </div>

          <div className="score-box">
            <div className="score-box-top">
              <Layers size={14} color="#c084fc" />
              <span>Simplicity</span>
            </div>
            <div className="score-box-val">{score.complexityScore} / 100</div>
          </div>
        </div>

        <button onClick={onClose} className="btn-victory-continue">
          <CheckCircle2 size={16} />
          <span>Continue Exploring Architecture</span>
        </button>
      </div>
    </div>
  );
};
