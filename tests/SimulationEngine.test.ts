import { describe, it, expect } from 'vitest';
import { SimulationEngine } from '../src/engine/SimulationEngine';

describe('SimulationEngine', () => {
  it('initializes default world with User and Server entities', () => {
    const engine = new SimulationEngine({ initialRps: 5 });
    const snapshot = engine.getSnapshot();

    expect(snapshot.entities.length).toBe(2);
    const user = snapshot.entities.find((e) => e.id === 'user-group-1');
    const server = snapshot.entities.find((e) => e.id === 'server-prod-1');

    expect(user).toBeDefined();
    expect(server).toBeDefined();
    expect(server?.status).toBe('HEALTHY');
    expect(snapshot.connections.length).toBe(1);
  });

  it('generates packets and simulates request lifecycle over ticks', () => {
    const engine = new SimulationEngine({ initialRps: 10 });
    
    // Step 20 ticks (1.0 simulation second)
    for (let i = 0; i < 20; i++) {
      engine.step();
    }

    const snapshot = engine.getSnapshot();
    expect(snapshot.metrics.requestsTotal).toBeGreaterThan(0);
    expect(snapshot.packets.length).toBeGreaterThan(0);
  });

  it('degrades server health when traffic burst is injected', () => {
    const engine = new SimulationEngine({ initialRps: 5 });

    // Verify initial health
    let snapshot = engine.getSnapshot();
    const serverBefore = snapshot.entities.find((e) => e.id === 'server-prod-1');
    expect(serverBefore?.status).toBe('HEALTHY');

    // Inject heavy traffic spike
    engine.injectSpike(60);

    // Advance 10 ticks for packets to reach server and overload connections
    for (let i = 0; i < 15; i++) {
      engine.step();
    }

    snapshot = engine.getSnapshot();
    const serverAfter = snapshot.entities.find((e) => e.id === 'server-prod-1');
    
    // CPU or health should show degradation
    expect(['DEGRADED', 'OVERLOADED', 'FAILING']).toContain(serverAfter?.status);
  });

  it('updates entity positions dynamically when moved', () => {
    const engine = new SimulationEngine();
    
    engine.updateEntityPosition('server-prod-1', { x: 400, y: 150 });
    const snapshot = engine.getSnapshot();
    const server = snapshot.entities.find((e) => e.id === 'server-prod-1');

    expect(server?.position.x).toBe(400);
    expect(server?.position.y).toBe(150);
  });
});
