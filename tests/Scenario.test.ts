import { describe, it, expect } from 'vitest';
import { SimulationEngine } from '../src/engine/SimulationEngine';

describe('Scenario 1: Keep The Website Online', () => {
  it('initializes with User, DNS, and Static Host', () => {
    const engine = new SimulationEngine({ initialRps: 5 });
    const snapshot = engine.getSnapshot();

    expect(snapshot.entities.length).toBe(3);
    expect(snapshot.entities.some((e) => e.type === 'user')).toBe(true);
    expect(snapshot.entities.some((e) => e.type === 'dns')).toBe(true);
    expect(snapshot.entities.some((e) => e.type === 'static_host')).toBe(true);
  });

  it('routes packets through DNS before reaching origin host', () => {
    const engine = new SimulationEngine({ initialRps: 10 });

    // Step 5 ticks
    for (let i = 0; i < 5; i++) {
      engine.step();
    }

    const snapshot = engine.getSnapshot();
    const packet = snapshot.packets[0];
    if (packet) {
      expect(packet.path).toContain('dns-1');
      expect(packet.path).toContain('user-group-1');
    }
  });

  it('applies Vertical Scaling solution and doubles host capacity', () => {
    const engine = new SimulationEngine();
    engine.applySolution('sol_vertical_scale');

    const snapshot = engine.getSnapshot();
    const server = snapshot.entities.find((e) => e.id === 'server-prod-1');

    expect(server?.resources.cpu.capacityCores).toBe(4);
    expect(server?.resources.memory.capacityMb).toBe(4096);
    expect(server?.configuration.maxRps).toBe(95);
    expect(snapshot.scenarioState.selectedSolutionId).toBe('sol_vertical_scale');
  });

  it('applies Edge CDN solution and inserts CDN node in topology', () => {
    const engine = new SimulationEngine();
    engine.applySolution('sol_add_cdn');

    const snapshot = engine.getSnapshot();
    const cdn = snapshot.entities.find((e) => e.id === 'cdn-edge-1');

    expect(cdn).toBeDefined();
    expect(cdn?.type).toBe('cdn');
    expect(snapshot.connections.some((c) => c.toId === 'cdn-edge-1')).toBe(true);
  });

  it('applies Load Balancer solution and spawns redundant second host', () => {
    const engine = new SimulationEngine();
    engine.applySolution('sol_load_balancer');

    const snapshot = engine.getSnapshot();
    const lb = snapshot.entities.find((e) => e.id === 'lb-1');
    const server2 = snapshot.entities.find((e) => e.id === 'server-prod-2');

    expect(lb).toBeDefined();
    expect(server2).toBeDefined();
    expect(snapshot.entities.filter((e) => e.type === 'static_host').length).toBe(2);
  });

  it('calculates S-tier victory score when CDN solution is selected', () => {
    const engine = new SimulationEngine();
    engine.applySolution('sol_add_cdn');

    // Simulate 12 seconds of sustained healthy traffic (240 ticks)
    for (let i = 0; i < 260; i++) {
      engine.step();
    }

    const snapshot = engine.getSnapshot();
    expect(snapshot.scenarioState.currentStageId).toBe('stage_victory');
    expect(snapshot.scenarioState.score?.grade).toBe('S');
  });
});
