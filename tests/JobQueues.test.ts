/**
 * tests/JobQueues.test.ts
 * Scenario 4: The Synchronous Job Crisis (Spec Phase 12 — Queues & Async Processing)
 */
import { describe, it, expect } from 'vitest';
import { SimulationEngine } from '../src/engine/SimulationEngine';
import { jobQueueScenario } from '../src/scenarios/jobQueueScenario';
import { SCENARIOS, SCENARIO_LIST } from '../src/scenarios';

describe('Scenario 4: The Synchronous Job Crisis', () => {
  it('loads the multi-tier checkout topology (user → frontend → api → postgres)', () => {
    const engine = new SimulationEngine();
    engine.loadScenario('scenario-4-job-queues');

    const snapshot = engine.getSnapshot();
    expect(snapshot.scenario.id).toBe('scenario-4-job-queues');

    const ids = snapshot.entities.map((e) => e.id);
    expect(ids).toContain('user-group-1');
    expect(ids).toContain('frontend-1');
    expect(ids).toContain('api-1');
    expect(ids).toContain('postgres-1');

    expect(snapshot.connections.some((c) => c.fromId === 'frontend-1' && c.toId === 'api-1')).toBe(true);
  });

  it('routes baseline requests to the synchronous billing api', () => {
    const engine = new SimulationEngine();
    engine.loadScenario('scenario-4-job-queues');

    for (let i = 0; i < 4; i++) {
      engine.step();
    }

    const packet = engine.getSnapshot().packets[0];
    expect(packet).toBeDefined();
    expect(packet.path).toEqual(['user-group-1', 'frontend-1', 'api-1']);
  });

  it('saturates the billing api under surge and opens the incident modal', () => {
    const engine = new SimulationEngine();
    engine.loadScenario('scenario-4-job-queues');
    engine.setTargetRps(40);

    // Past the 10s baseline mark, sustained overload must trip stage_degraded.
    for (let i = 0; i < 260; i++) {
      engine.step();
    }

    const snapshot = engine.getSnapshot();
    expect(snapshot.scenarioState.currentStageId).toBe('stage_degraded');
    expect(snapshot.scenarioState.isSolutionModalOpen).toBe(true);

    const api = snapshot.entities.find((e) => e.id === 'api-1');
    expect(api && (api.status === 'OVERLOADED' || api.status === 'FAILING')).toBe(true);
  });

  it('applies async queue solution: deploys queue + worker and rewires traffic', () => {
    const engine = new SimulationEngine();
    engine.loadScenario('scenario-4-job-queues');
    engine.applySolution('sol_async_queue');

    const snapshot = engine.getSnapshot();
    const ids = snapshot.entities.map((e) => e.id);
    expect(ids).toContain('queue-1');
    expect(ids).toContain('worker-1');

    expect(snapshot.connections.some((c) => c.fromId === 'api-1' && c.toId === 'queue-1')).toBe(true);
    expect(snapshot.connections.some((c) => c.fromId === 'queue-1' && c.toId === 'worker-1')).toBe(true);

    // Cost model: queue $5 + worker $7 = +$12/month
    expect(snapshot.metrics.monthlyCost).toBe(45.0 + 12.0);

    // Requests now traverse the async pipeline
    engine.setTargetRps(20);
    for (let i = 0; i < 6; i++) {
      engine.step();
    }
    const routed = engine
      .getSnapshot()
      .packets.some((p) => p.path.join('→').includes('queue-1→worker-1'));
    expect(routed).toBe(true);
  });

  it('queue-only trap deploys a backlog with zero consumers', () => {
    const engine = new SimulationEngine();
    engine.loadScenario('scenario-4-job-queues');
    engine.applySolution('sol_queue_only');

    const snapshot = engine.getSnapshot();
    const ids = snapshot.entities.map((e) => e.id);
    expect(ids).toContain('queue-1');
    expect(ids).not.toContain('worker-1');

    const warned = snapshot.events.some((e) => e.message.includes('ZERO consumers'));
    expect(warned).toBe(true);
  });

  it('reaches victory with grade S when the async pipeline sustains load', () => {
    const engine = new SimulationEngine();
    engine.loadScenario('scenario-4-job-queues');
    engine.setTargetRps(40);

    // Drive into the degraded incident first
    for (let i = 0; i < 260; i++) {
      engine.step();
    }
    expect(engine.getSnapshot().scenarioState.currentStageId).toBe('stage_degraded');

    engine.applySolution('sol_async_queue');

    // Sustain the required healthy window (12s = 240 ticks + drain margin)
    for (let i = 0; i < 340; i++) {
      engine.step();
    }

    const snapshot = engine.getSnapshot();
    expect(snapshot.scenarioState.currentStageId).toBe('stage_victory');
    expect(snapshot.scenarioState.score?.grade).toBe('S');
  });

  it('declares its learning objectives and 3 trade-off solutions', () => {
    expect(jobQueueScenario.learningObjectives.length).toBeGreaterThanOrEqual(4);
    expect(jobQueueScenario.availableSolutions.length).toBe(3);
    const solutionIds = jobQueueScenario.availableSolutions.map((s) => s.id);
    expect(solutionIds).toContain('sol_async_queue');
    expect(solutionIds).toContain('sol_vertical_billing');
    expect(solutionIds).toContain('sol_queue_only');
  });
});

describe('Scenario registry (learning ladder)', () => {
  it('exposes 4 ordered lessons', () => {
    expect(SCENARIO_LIST.map((entry) => entry.id)).toEqual([
      'scenario-1-static-site',
      'scenario-2-backend-db',
      'scenario-3-redis-cache',
      'scenario-4-job-queues',
    ]);
  });

  it('every registered scenario is fully formed', () => {
    for (const scenario of Object.values(SCENARIOS)) {
      expect(scenario.stages.length).toBe(5);
      expect(scenario.availableSolutions.length).toBeGreaterThanOrEqual(3);
      expect(scenario.successConditions.minSustainedSeconds).toBeGreaterThan(0);
      const ids = scenario.availableSolutions.map((s) => s.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  it('snapshot carries the active scenario so the HUD can never desync', () => {
    const engine = new SimulationEngine();
    engine.loadScenario('scenario-2-backend-db');
    expect(engine.getSnapshot().scenario.id).toBe('scenario-2-backend-db');

    engine.loadScenario('scenario-4-job-queues');
    expect(engine.getSnapshot().scenario.id).toBe('scenario-4-job-queues');
  });
});
