import { describe, it, expect } from 'vitest';
import { SimulationEngine } from '../src/engine/SimulationEngine';

describe('SimulationEngine', () => {
  it('initializes default world with User, DNS, and Server entities', () => {
    const engine = new SimulationEngine({ initialRps: 5 });
    const snapshot = engine.getSnapshot();

    expect(snapshot.entities.length).toBe(3);
    const user = snapshot.entities.find((e) => e.id === 'user-group-1');
    const dns = snapshot.entities.find((e) => e.id === 'dns-1');
    const server = snapshot.entities.find((e) => e.id === 'server-prod-1');

    expect(user).toBeDefined();
    expect(dns).toBeDefined();
    expect(server).toBeDefined();
    expect(server?.status).toBe('HEALTHY');
    expect(snapshot.connections.length).toBe(2);
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

    // Inject heavy traffic spike
    engine.injectSpike(60);

    // Advance 20 ticks: packets reach server at tick 16 and saturate CPU at tick 19-21
    for (let i = 0; i < 20; i++) {
      engine.step();
    }

    const snapshot = engine.getSnapshot();
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

  it('resets entity positions back to canonical layout when resetLayout is called', () => {
    const engine = new SimulationEngine();

    // Move server to custom coordinates
    engine.updateEntityPosition('server-prod-1', { x: 999, y: 888 });
    expect(engine.getSnapshot().entities.find((e) => e.id === 'server-prod-1')?.position.x).toBe(999);

    // Call resetLayout
    engine.resetLayout();
    const serverAfter = engine.getSnapshot().entities.find((e) => e.id === 'server-prod-1');
    expect(serverAfter?.position.x).toBe(260);
    expect(serverAfter?.position.y).toBe(0);
  });
});
