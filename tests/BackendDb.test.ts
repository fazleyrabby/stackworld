import { describe, it, expect } from 'vitest';
import { SimulationEngine } from '../src/engine/SimulationEngine';

describe('Scenario 2: The Slow Database Incident', () => {
  it('initializes topology with User, Frontend, API, and PostgreSQL', () => {
    const engine = new SimulationEngine();
    engine.loadScenario('scenario-2-backend-db');

    const snapshot = engine.getSnapshot();
    expect(snapshot.entities.length).toBe(4);
    expect(snapshot.entities.some((e) => e.type === 'user')).toBe(true);
    expect(snapshot.entities.some((e) => e.id === 'frontend-1')).toBe(true);
    expect(snapshot.entities.some((e) => e.type === 'api')).toBe(true);
    expect(snapshot.entities.some((e) => e.type === 'database')).toBe(true);

    const postgres = snapshot.entities.find((e) => e.id === 'postgres-1');
    expect(postgres?.resources.connections.max).toBe(20);
    expect(postgres?.configuration.hasIndex).toBe(false);
  });

  it('routes multi-tier requests User -> Frontend -> API -> PostgreSQL', () => {
    const engine = new SimulationEngine({ initialRps: 10 });
    engine.loadScenario('scenario-2-backend-db');

    // Step a few ticks to spawn requests
    for (let i = 0; i < 4; i++) {
      engine.step();
    }

    const snapshot = engine.getSnapshot();
    const packet = snapshot.packets[0];
    expect(packet).toBeDefined();
    expect(packet.path).toEqual(['user-group-1', 'frontend-1', 'api-1', 'postgres-1']);
  });

  it('transforms in-flight packet to sql_query when reaching database', () => {
    const engine = new SimulationEngine({ initialRps: 10 });
    engine.loadScenario('scenario-2-backend-db');

    // Advance enough ticks for packet to cross frontend and API into database
    for (let i = 0; i < 25; i++) {
      engine.step();
    }

    const snapshot = engine.getSnapshot();
    const hasSqlOrResult = snapshot.packets.some(
      (p) => p.type === 'sql_query' || p.type === 'sql_result' || p.type === 'response'
    );
    expect(hasSqlOrResult).toBe(true);
  });

  it('applies B-Tree index solution and marks database indexed', () => {
    const engine = new SimulationEngine();
    engine.loadScenario('scenario-2-backend-db');
    engine.applySolution('sol_add_db_index');

    const snapshot = engine.getSnapshot();
    const postgres = snapshot.entities.find((e) => e.id === 'postgres-1');

    expect(postgres?.configuration.hasIndex).toBe(true);
    expect(snapshot.scenarioState.selectedSolutionId).toBe('sol_add_db_index');
  });

  it('applies PgBouncer solution and inserts connection pooler into topology', () => {
    const engine = new SimulationEngine();
    engine.loadScenario('scenario-2-backend-db');
    engine.applySolution('sol_pgbouncer');

    const snapshot = engine.getSnapshot();
    const pooler = snapshot.entities.find((e) => e.id === 'pgbouncer-1');

    expect(pooler).toBeDefined();
    expect(pooler?.type).toBe('pgbouncer');
    expect(snapshot.connections.some((c) => c.toId === 'pgbouncer-1')).toBe(true);
    expect(snapshot.connections.some((c) => c.fromId === 'pgbouncer-1' && c.toId === 'postgres-1')).toBe(true);
  });

  it('applies DB hardware upgrade and scales max connections', () => {
    const engine = new SimulationEngine();
    engine.loadScenario('scenario-2-backend-db');
    engine.applySolution('sol_upgrade_db_tier');

    const snapshot = engine.getSnapshot();
    const postgres = snapshot.entities.find((e) => e.id === 'postgres-1');

    expect(postgres?.resources.cpu.capacityCores).toBe(4);
    expect(postgres?.resources.memory.capacityMb).toBe(8192);
    expect(postgres?.resources.connections.max).toBe(80);
    expect(snapshot.metrics.monthlyCost).toBe(70.0); // 35 base + 35 upgrade
  });

  it('calculates S-tier victory score when B-Tree index solution resolves the incident', () => {
    const engine = new SimulationEngine();
    engine.loadScenario('scenario-2-backend-db');
    engine.applySolution('sol_add_db_index');

    // Sustain healthy traffic for 12+ seconds (250 ticks at 20 ticks/sec = 12.5s)
    for (let i = 0; i < 260; i++) {
      engine.step();
    }

    const snapshot = engine.getSnapshot();
    expect(snapshot.scenarioState.currentStageId).toBe('stage_victory');
    expect(snapshot.scenarioState.score?.grade).toBe('S');
    expect(snapshot.scenarioState.score?.costEfficiencyScore).toBe(100);
  });
});
