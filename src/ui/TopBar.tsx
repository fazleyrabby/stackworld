import React from 'react';
import { SimulationSnapshot, HealthStatus } from '../shared/types';
import { Activity, Bell, DollarSign, Globe, Layers, Zap } from 'lucide-react';
import { useUiStore } from '../state/useUiStore';

interface TopBarProps {
  snapshot: SimulationSnapshot;
  activeScenarioId: 'scenario-1-static-site' | 'scenario-2-backend-db' | 'scenario-3-redis-cache';
  onSelectScenario: (scenarioId: 'scenario-1-static-site' | 'scenario-2-backend-db' | 'scenario-3-redis-cache') => void;
}

export const TopBar: React.FC<TopBarProps> = ({ snapshot, activeScenarioId, onSelectScenario }) => {
  const toggleEventLog = useUiStore((state) => state.toggleEventLog);
  const isEventLogOpen = useUiStore((state) => state.isEventLogOpen);

  const formatSimTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
    const secs = Math.floor(seconds % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
  };

  const getHealthClass = (status: HealthStatus) => {
    switch (status) {
      case 'HEALTHY':
        return 'health-healthy';
      case 'DEGRADED':
        return 'health-degraded';
      case 'OVERLOADED':
        return 'health-overloaded';
      case 'FAILING':
      case 'DOWN':
        return 'health-failing';
      default:
        return 'health-healthy';
    }
  };

  return (
    <header className="top-bar">
      {/* Left: Brand & Scenario */}
      <div className="top-bar-left">
        <div className="brand-group">
          <div className="brand-icon">
            <Zap size={15} strokeWidth={2.5} color="var(--cyan)" />
          </div>
          <span className="brand-title">
            STACK<span>WORLD</span>
          </span>
        </div>

        <div className="scenario-badge">
          <Layers size={13} color="var(--cyan)" />
          <span className="label">Scenario:</span>
          <select
            value={activeScenarioId}
            onChange={(e) => onSelectScenario(e.target.value as 'scenario-1-static-site' | 'scenario-2-backend-db' | 'scenario-3-redis-cache')}
            className="scenario-select"
            aria-label="Select simulation scenario"
          >
            <option value="scenario-1-static-site">Phase 1: Keep Website Online</option>
            <option value="scenario-2-backend-db">Phase 2: The Slow Database Incident</option>
            <option value="scenario-3-redis-cache">Phase 3: The Cache Stampede Crisis</option>
          </select>
        </div>
      </div>

      {/* Center: System Telemetry */}
      <div className="top-bar-center">
        {/* Sim Clock */}
        <div className="telemetry-pill">
          <span className={`pulse-dot ${snapshot.isPaused ? 'paused' : ''}`} />
          <span className="telemetry-label">SIM TIME</span>
          <span className="tabular-num-slot time-slot">
            {formatSimTime(snapshot.timeSeconds)}
          </span>
        </div>

        {/* Global Cluster Health */}
        <div className={`health-pill ${getHealthClass(snapshot.metrics.clusterHealth)}`}>
          <Activity size={13} />
          <span>{snapshot.metrics.clusterHealth}</span>
        </div>

        {/* Requests Telemetry */}
        <div className="telemetry-pill">
          <Globe size={13} color="var(--text-muted)" />
          <span className="telemetry-label">RPS:</span>
          <span className="tabular-num-slot rps-slot">
            {snapshot.metrics.currentRps.toFixed(1)}
          </span>
          <span className="telemetry-divider">|</span>
          <span className="telemetry-label">TOTAL:</span>
          <span className="tabular-num-slot total-slot">
            {snapshot.metrics.requestsTotal}
          </span>
        </div>
      </div>

      {/* Right: Budget & Event Log Toggle */}
      <div className="top-bar-right">
        <div className="telemetry-pill">
          <DollarSign size={13} color="var(--emerald)" />
          <span className="telemetry-label">Budget:</span>
          <span className="tabular-num-slot budget-slot">
            ${snapshot.metrics.monthlyCost.toFixed(2)}
          </span>
          <span style={{ color: 'var(--text-muted)' }}>
            / ${activeScenarioId === 'scenario-3-redis-cache' ? '60.00' : activeScenarioId === 'scenario-2-backend-db' ? '45.00' : '20.00'}
          </span>
        </div>

        <button
          onClick={toggleEventLog}
          className={`btn-event-log ${isEventLogOpen ? 'active' : ''}`}
        >
          <Bell size={13} />
          <span>Events</span>
          {snapshot.events.length > 0 && (
            <span className="event-count-badge">{snapshot.events.length}</span>
          )}
        </button>
      </div>
    </header>
  );
};
