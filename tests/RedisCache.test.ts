import { describe, it, expect } from 'vitest';
import { SimulationEngine } from '../src/engine/SimulationEngine';

describe('Scenario 3: The Cache Stampede Crisis', () => {
  it('initializes topology with User, Frontend, API, Redis 7.2, and PostgreSQL 16', () => {
    const engine = new SimulationEngine();
    engine.loadScenario('scenario-3-redis-cache');

    const snapshot = engine.getSnapshot();
    expect(snapshot.entities.length).toBe(5);
    expect(snapshot.entities.some((e) => e.type === 'user')).toBe(true);
    expect(snapshot.entities.some((e) => e.id === 'frontend-1')).toBe(true);
    expect(snapshot.entities.some((e) => e.id === 'api-1')).toBe(true);
    expect(snapshot.entities.some((e) => e.id === 'redis-1')).toBe(true);
    expect(snapshot.entities.some((e) => e.id === 'postgres-1')).toBe(true);

    const redis = snapshot.entities.find((e) => e.id === 'redis-1');
    expect(redis?.type).toBe('redis');
    expect(redis?.configuration.cacheHitRatio).toBe(0.90);
    expect(redis?.resources.memory.capacityMb).toBe(256);

    const postgres = snapshot.entities.find((e) => e.id === 'postgres-1');
    expect(postgres?.resources.connections.max).toBe(20);
  });

  it('routes multi-hop requests User -> Frontend -> API -> Redis', () => {
    const engine = new SimulationEngine({ initialRps: 8 });
    engine.loadScenario('scenario-3-redis-cache');

    // Step a few ticks to spawn requests
    for (let i = 0; i < 4; i++) {
      engine.step();
    }

    const snapshot = engine.getSnapshot();
    const packet = snapshot.packets[0];
    expect(packet).toBeDefined();
    expect(packet.path).toEqual(['user-group-1', 'frontend-1', 'api-1', 'redis-1']);
  });

  it('generates cache_hit packets returning directly from Redis to User', () => {
    const engine = new SimulationEngine({ initialRps: 8 });
    engine.loadScenario('scenario-3-redis-cache');

    // Advance ticks so packets reach Redis and trigger cache hit return
    for (let i = 0; i < 20; i++) {
      engine.step();
    }

    const snapshot = engine.getSnapshot();
    const hasCacheHit = snapshot.packets.some((p) => p.type === 'cache_hit' && p.isCached === true);
    expect(hasCacheHit).toBe(true);
  });

  it('applies Singleflight Mutex Lock solution and configures API stampede guard', () => {
    const engine = new SimulationEngine();
    engine.loadScenario('scenario-3-redis-cache');
    engine.applySolution('sol_mutex_stampede_lock');

    const snapshot = engine.getSnapshot();
    const api = snapshot.entities.find((e) => e.id === 'api-1');

    expect(api?.configuration.hasMutexLock).toBe(true);
    expect(snapshot.scenarioState.selectedSolutionId).toBe('sol_mutex_stampede_lock');
    expect(snapshot.metrics.monthlyCost).toBe(45.0); // Zero cost added!
  });

  it('applies Redis cluster upgrade solution and increases capacity', () => {
    const engine = new SimulationEngine();
    engine.loadScenario('scenario-3-redis-cache');
    engine.applySolution('sol_deploy_redis');

    const snapshot = engine.getSnapshot();
    const redis = snapshot.entities.find((e) => e.id === 'redis-1');

    expect(redis?.resources.memory.capacityMb).toBe(1024);
    expect(redis?.configuration.cacheHitRatio).toBe(0.95);
    expect(snapshot.metrics.monthlyCost).toBe(60.0); // 45 base + 15
  });

  it('applies PostgreSQL Read Replica solution and provisions replica node', () => {
    const engine = new SimulationEngine();
    engine.loadScenario('scenario-3-redis-cache');
    engine.applySolution('sol_db_read_replica');

    const snapshot = engine.getSnapshot();
    const replica = snapshot.entities.find((e) => e.id === 'postgres-replica-1');

    expect(replica).toBeDefined();
    expect(replica?.type).toBe('database');
    expect(snapshot.connections.some((c) => c.toId === 'postgres-replica-1')).toBe(true);
    expect(snapshot.metrics.monthlyCost).toBe(75.0); // 45 base + 30
  });

  it('calculates S-tier victory score when Singleflight Mutex resolves the stampede at $0 cost', () => {
    const engine = new SimulationEngine();
    engine.loadScenario('scenario-3-redis-cache');
    engine.applySolution('sol_mutex_stampede_lock');

    // Sustain healthy traffic for 12+ seconds (250 ticks at 20 ticks/sec = 12.5s)
    for (let i = 0; i < 260; i++) {
      engine.step();
    }

    const snapshot = engine.getSnapshot();
    expect(snapshot.scenarioState.currentStageId).toBe('stage_victory');
    expect(snapshot.scenarioState.score?.grade).toBe('S');
    expect(snapshot.scenarioState.score?.costEfficiencyScore).toBe(100);
    expect(snapshot.scenarioState.score?.reliabilityScore).toBe(99);
  });
});
