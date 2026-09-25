/**
 * SimulationEngine.ts
 * 
 * The core deterministic simulation engine for StackWorld.
 * STRICT RULE: Zero React or UI dependencies.
 * 
 * Supports:
 * - Scenario 1: Keep The Website Online (Static Host + DNS + CDN/LB)
 * - Scenario 2: The Slow Database Incident (Frontend + Backend API + PostgreSQL)
 * - Scenario 3: The Cache Stampede Crisis (Redis caching + thundering herd)
 * - Scenario 4: The Synchronous Job Crisis (Job Queue + async workers)
 * - Dynamic live topology mutations
 * - Multi-tier routing and SQL query simulation
 */

import {
  Entity,
  Connection,
  Packet,
  SimulationMetrics,
  SimulationEvent,
  SimulationSnapshot,
  HealthStatus,
  Vector2D,
} from '../shared/types';
import { SimulationClock } from './Clock';
import { getScenario } from '../scenarios';
import { staticSiteScenario } from '../scenarios/staticSiteScenario';
import { ScenarioDefinition, ScenarioState } from '../scenarios/types';

/**
 * Deterministic PRNG (mulberry32). The engine must be reproducible tick-for-tick
 * for unit tests and replay, so no Math.random() inside simulation logic.
 */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface SimulationEngineConfig {
  seed?: number;
  initialRps?: number;
  initialScenarioId?: string;
}

export class SimulationEngine {
  public readonly clock: SimulationClock;

  private activeScenario: ScenarioDefinition = staticSiteScenario;
  private entities: Map<string, Entity> = new Map();
  private connections: Map<string, Connection> = new Map();
  private packets: Map<string, Packet> = new Map();
  private events: SimulationEvent[] = [];

  private metrics: SimulationMetrics = {
    requestsTotal: 0,
    requestsSuccessful: 0,
    requestsFailed: 0,
    currentRps: 0,
    averageLatencyMs: 22,
    clusterHealth: 'HEALTHY',
    monthlyCost: 15.0,
  };

  private scenarioState: ScenarioState = {
    currentStageId: 'stage_baseline',
    selectedSolutionId: null,
    sustainedHealthySeconds: 0,
    isSolutionModalOpen: false,
    isVictoryModalOpen: false,
  };

  private targetRps: number = 6;
  private pendingRequestAccumulator: number = 0;
  private nextPacketId: number = 1;
  private nextEventId: number = 1;
  private requestCounter: number = 0;
  private rng: () => number;
  private completedRequestsWindow: { tick: number; latencyMs: number; success: boolean }[] = [];

  // Snapshot listeners
  private snapshotListeners: Set<(snapshot: SimulationSnapshot) => void> = new Set();

  constructor(config: SimulationEngineConfig = {}) {
    this.clock = new SimulationClock(20);
    this.rng = mulberry32(config.seed ?? 1337);
    this.targetRps = config.initialRps ?? 6;

    this.loadScenario(config.initialScenarioId ?? staticSiteScenario.id);

    this.clock.subscribe((tick, _simTimeSeconds, dtSeconds) => {
      this.tick(tick, _simTimeSeconds, dtSeconds);
    });
  }

  public subscribe(listener: (snapshot: SimulationSnapshot) => void): () => void {
    this.snapshotListeners.add(listener);
    listener(this.getSnapshot());
    return () => this.snapshotListeners.delete(listener);
  }

  public start(): void {
    this.clock.start();
  }

  public stop(): void {
    this.clock.stop();
  }

  public setPaused(paused: boolean): void {
    this.clock.setPaused(paused);
    this.emitSnapshot();
  }

  public togglePause(): boolean {
    const paused = this.clock.togglePause();
    this.emitSnapshot();
    return paused;
  }

  public setSpeed(multiplier: number): void {
    this.clock.setSpeed(multiplier);
    this.emitSnapshot();
  }

  public step(): void {
    this.clock.step();
  }

  public setTargetRps(rps: number): void {
    this.targetRps = Math.max(1, rps);
    this.logEvent('info', `Traffic target adjusted to ${this.targetRps} req/s`);
    this.emitSnapshot();
  }

  public getTargetRps(): number {
    return this.targetRps;
  }

  public getActiveScenario(): ScenarioDefinition {
    return this.activeScenario;
  }

  public injectSpike(count: number = 25): void {
    this.pendingRequestAccumulator += count;
    this.logEvent('warn', `Traffic spike injected: +${count} concurrent requests!`);
    this.emitSnapshot();
  }

  public updateEntityPosition(id: string, position: Vector2D): void {
    const entity = this.entities.get(id);
    if (entity) {
      entity.position = { ...position };
      this.emitSnapshot();
    }
  }

  public openSolutionModal(): void {
    this.scenarioState.isSolutionModalOpen = true;
    this.emitSnapshot();
  }

  public closeSolutionModal(): void {
    this.scenarioState.isSolutionModalOpen = false;
    this.emitSnapshot();
  }

  public closeVictoryModal(): void {
    this.scenarioState.isVictoryModalOpen = false;
    this.emitSnapshot();
  }

  /**
   * Load any registered scenario by id (see src/scenarios/index.ts registry).
   */
  public loadScenario(scenarioId: string): void {
    const scenario = getScenario(scenarioId) ?? staticSiteScenario;

    this.clock.reset();
    this.entities.clear();
    this.connections.clear();
    this.packets.clear();
    this.events = [];
    this.completedRequestsWindow = [];
    this.pendingRequestAccumulator = 0;

    this.activeScenario = scenario;
    this.metrics = {
      requestsTotal: 0,
      requestsSuccessful: 0,
      requestsFailed: 0,
      currentRps: 0,
      averageLatencyMs: 22,
      clusterHealth: 'HEALTHY',
      monthlyCost: 15.0,
    };

    if (scenario.id === 'scenario-4-job-queues') {
      this.targetRps = 6;
      this.metrics.monthlyCost = 45.0;
      this.initializeScenario4();
    } else if (scenario.id === 'scenario-3-redis-cache') {
      this.targetRps = 8;
      this.metrics.monthlyCost = 45.0;
      this.initializeScenario3();
    } else if (scenario.id === 'scenario-2-backend-db') {
      this.targetRps = 10;
      this.metrics.monthlyCost = 35.0;
      this.initializeScenario2();
    } else {
      this.targetRps = 6;
      this.metrics.monthlyCost = 15.0;
      this.initializeScenario1();
    }

    this.scenarioState = {
      currentStageId: 'stage_baseline',
      selectedSolutionId: null,
      sustainedHealthySeconds: 0,
      isSolutionModalOpen: false,
      isVictoryModalOpen: false,
    };

    this.emitSnapshot();
  }

  public getScenarioId(): string {
    return this.activeScenario.id;
  }

  /**
   * Resets all entities in the active scenario to their canonical spacious layout.
   */
  public resetLayout(): void {
    if (this.activeScenario.id === 'scenario-1-static-site') {
      const user = this.entities.get('user-group-1');
      const dns = this.entities.get('dns-1');
      const s1 = this.entities.get('server-prod-1');
      const s2 = this.entities.get('server-prod-2');
      const cdn = this.entities.get('cdn-edge-1');
      const lb = this.entities.get('lb-1');

      if (user) user.position = { x: -380, y: 0 };
      if (dns) dns.position = { x: -100, y: 0 };

      if (cdn) {
        cdn.position = { x: 140, y: 0 };
        if (s1) s1.position = { x: 420, y: 0 };
      } else if (lb) {
        lb.position = { x: 140, y: 0 };
        if (s1) s1.position = { x: 420, y: -110 };
        if (s2) s2.position = { x: 420, y: 110 };
      } else {
        if (s1) s1.position = { x: 260, y: 0 };
      }
    } else if (this.activeScenario.id === 'scenario-2-backend-db') {
      const user = this.entities.get('user-group-1');
      const fe = this.entities.get('frontend-1');
      const api = this.entities.get('api-1');
      const pgb = this.entities.get('pgbouncer-1');
      const db = this.entities.get('postgres-1');

      if (user) user.position = { x: -440, y: 0 };
      if (fe) fe.position = { x: -160, y: 0 };
      if (api) api.position = { x: 120, y: 0 };
      if (pgb) {
        pgb.position = { x: 360, y: 0 };
        if (db) db.position = { x: 620, y: 0 };
      } else {
        if (db) db.position = { x: 400, y: 0 };
      }
    } else if (this.activeScenario.id === 'scenario-3-redis-cache') {
      const user = this.entities.get('user-group-1');
      const fe = this.entities.get('frontend-1');
      const api = this.entities.get('api-1');
      const redis = this.entities.get('redis-1');
      const db = this.entities.get('postgres-1');
      const rep = this.entities.get('postgres-replica-1');

      if (user) user.position = { x: -440, y: 0 };
      if (fe) fe.position = { x: -160, y: 0 };
      if (api) api.position = { x: 100, y: 0 };
      if (redis) redis.position = { x: 380, y: -100 };
      if (db) db.position = { x: 380, y: 100 };
      if (rep) rep.position = { x: 640, y: 100 };
    } else if (this.activeScenario.id === 'scenario-4-job-queues') {
      const user = this.entities.get('user-group-1');
      const fe = this.entities.get('frontend-1');
      const api = this.entities.get('api-1');
      const queue = this.entities.get('queue-1');
      const worker = this.entities.get('worker-1');
      const db = this.entities.get('postgres-1');

      if (user) user.position = { x: -440, y: 0 };
      if (fe) fe.position = { x: -160, y: 0 };
      if (queue) {
        if (api) api.position = { x: 120, y: 0 };
        if (queue) queue.position = { x: 400, y: 0 };
        if (worker) worker.position = { x: 660, y: 0 };
      } else {
        if (api) api.position = { x: 160, y: 0 };
      }
      if (db) db.position = { x: 120, y: 200 };
    }

    this.emitSnapshot();
  }

  /**
   * Applies an architectural solution chosen by the learner.
   */
  public applySolution(solutionId: string): void {
    this.scenarioState.selectedSolutionId = solutionId;
    this.scenarioState.isSolutionModalOpen = false;
    this.scenarioState.currentStageId = 'stage_solution_applied';
    this.scenarioState.sustainedHealthySeconds = 0;

    // Handle Scenario 1 Solutions
    if (solutionId === 'sol_vertical_scale') {
      const server = this.entities.get('server-prod-1');
      if (server) {
        server.name = 'Web Host (4 vCPU / 4GB)';
        server.resources.cpu.capacityCores = 4;
        server.resources.memory.capacityMb = 4096;
        server.resources.connections.max = 128;
        server.configuration.maxRps = 95;
        server.costMonthly += 15.0;
      }
      this.metrics.monthlyCost += 15.0;
      this.logEvent('success', 'Architecture updated: Server vertically upgraded to 4 vCPUs / 4GB RAM.');
    } else if (solutionId === 'sol_add_cdn') {
      const cdn: Entity = {
        id: 'cdn-edge-1',
        type: 'cdn',
        name: 'Cloudflare Edge CDN',
        position: { x: 140, y: 0 },
        status: 'HEALTHY',
        resources: {
          cpu: { capacityCores: 8, usedCores: 0.2, utilizationPct: 2.5 },
          memory: { capacityMb: 4096, usedMb: 320, utilizationPct: 7.8 },
          connections: { current: 0, max: 5000 },
        },
        configuration: {
          cacheHitRatio: 0.8,
          edgeLocations: 280,
          ttlSeconds: 86400,
        },
        costMonthly: 5.0,
      };

      const server1 = this.entities.get('server-prod-1');
      if (server1) {
        server1.position = { x: 420, y: 0 };
      }

      this.entities.set(cdn.id, cdn);

      this.connections.delete('conn-dns-to-server');
      this.connections.set('conn-dns-to-cdn', {
        id: 'conn-dns-to-cdn',
        fromId: 'dns-1',
        toId: 'cdn-edge-1',
        bandwidthMbps: 1000,
        latencyMs: 6,
        currentTrafficMbps: 0,
      });
      this.connections.set('conn-cdn-to-server', {
        id: 'conn-cdn-to-server',
        fromId: 'cdn-edge-1',
        toId: 'server-prod-1',
        bandwidthMbps: 500,
        latencyMs: 14,
        currentTrafficMbps: 0,
      });

      this.metrics.monthlyCost += 5.0;
      this.logEvent('success', 'Architecture updated: Edge CDN deployed! 80% of static traffic cached.');
    } else if (solutionId === 'sol_load_balancer') {
      const lb: Entity = {
        id: 'lb-1',
        type: 'load_balancer',
        name: 'Nginx Load Balancer',
        position: { x: 140, y: 0 },
        status: 'HEALTHY',
        resources: {
          cpu: { capacityCores: 2, usedCores: 0.1, utilizationPct: 5.0 },
          memory: { capacityMb: 1024, usedMb: 120, utilizationPct: 11.7 },
          connections: { current: 0, max: 2000 },
        },
        configuration: {
          algorithm: 'Round Robin',
          healthCheckIntervalMs: 5000,
        },
        costMonthly: 10.0,
      };

      const server2: Entity = {
        id: 'server-prod-2',
        type: 'static_host',
        name: 'Web Host 02',
        position: { x: 420, y: 110 },
        status: 'HEALTHY',
        resources: {
          cpu: { capacityCores: 2, usedCores: 0.1, utilizationPct: 5.0 },
          memory: { capacityMb: 2048, usedMb: 310, utilizationPct: 15.1 },
          connections: { current: 0, max: 64 },
        },
        configuration: {
          ipAddress: '198.51.100.43',
          domain: 'stackworld.app',
          maxRps: 45,
          baseLatencyMs: 18,
        },
        costMonthly: 15.0,
      };

      const server1 = this.entities.get('server-prod-1');
      if (server1) {
        server1.name = 'Web Host 01';
        server1.position = { x: 420, y: -110 };
      }

      this.entities.set(lb.id, lb);
      this.entities.set(server2.id, server2);

      this.connections.delete('conn-dns-to-server');
      this.connections.set('conn-dns-to-lb', {
        id: 'conn-dns-to-lb',
        fromId: 'dns-1',
        toId: 'lb-1',
        bandwidthMbps: 1000,
        latencyMs: 6,
        currentTrafficMbps: 0,
      });
      this.connections.set('conn-lb-to-s1', {
        id: 'conn-lb-to-s1',
        fromId: 'lb-1',
        toId: 'server-prod-1',
        bandwidthMbps: 500,
        latencyMs: 8,
        currentTrafficMbps: 0,
      });
      this.connections.set('conn-lb-to-s2', {
        id: 'conn-lb-to-s2',
        fromId: 'lb-1',
        toId: 'server-prod-2',
        bandwidthMbps: 500,
        latencyMs: 8,
        currentTrafficMbps: 0,
      });

      this.metrics.monthlyCost += 25.0;
      this.logEvent('success', 'Architecture updated: Nginx Load Balancer and Host 02 deployed.');
    }

    // Handle Scenario 2 Solutions
    if (solutionId === 'sol_add_db_index') {
      const db = this.entities.get('postgres-1');
      if (db) {
        db.configuration.hasIndex = true;
        db.configuration.unindexedScan = false;
        db.configuration.slowQueryThresholdMs = 4;
      }
      this.logEvent('success', 'CREATE INDEX idx_orders_status ON orders(status, created_at) executed! Scan time: 3ms.');
    } else if (solutionId === 'sol_pgbouncer') {
      const pgbouncer: Entity = {
        id: 'pgbouncer-1',
        type: 'pgbouncer',
        name: 'PgBouncer Pooler',
        position: { x: 360, y: 0 },
        status: 'HEALTHY',
        resources: {
          cpu: { capacityCores: 1, usedCores: 0.1, utilizationPct: 8.0 },
          memory: { capacityMb: 512, usedMb: 42, utilizationPct: 8.2 },
          connections: { current: 0, max: 1000 },
        },
        configuration: {
          poolMode: 'transaction',
          defaultPoolSize: 8,
          maxClientConn: 500,
        },
        costMonthly: 10.0,
      };

      const db = this.entities.get('postgres-1');
      if (db) {
        db.configuration.hasPooler = true;
        db.position = { x: 620, y: 0 };
      }

      this.entities.set(pgbouncer.id, pgbouncer);

      this.connections.delete('conn-api-to-db');
      this.connections.set('conn-api-to-pooler', {
        id: 'conn-api-to-pooler',
        fromId: 'api-1',
        toId: 'pgbouncer-1',
        bandwidthMbps: 1000,
        latencyMs: 2,
        currentTrafficMbps: 0,
      });
      this.connections.set('conn-pooler-to-db', {
        id: 'conn-pooler-to-db',
        fromId: 'pgbouncer-1',
        toId: 'postgres-1',
        bandwidthMbps: 1000,
        latencyMs: 2,
        currentTrafficMbps: 0,
      });

      this.metrics.monthlyCost += 10.0;
      this.logEvent('success', 'PgBouncer connection pooler active. Client sockets multiplexed over 8 backend connections.');
    } else if (solutionId === 'sol_upgrade_db_tier') {
      const db = this.entities.get('postgres-1');
      if (db) {
        db.name = 'PostgreSQL (4 vCPU / 8GB)';
        db.resources.cpu.capacityCores = 4;
        db.resources.memory.capacityMb = 8192;
        db.resources.connections.max = 80;
        db.costMonthly += 35.0;
      }
      this.metrics.monthlyCost += 35.0;
      this.logEvent('success', 'Database tier upgraded to 4 vCPUs / 8GB RAM.');
    }

    // Handle Scenario 3 Solutions
    if (solutionId === 'sol_mutex_stampede_lock') {
      const api = this.entities.get('api-1');
      if (api) {
        api.configuration.hasMutexLock = true;
      }
      this.logEvent('success', 'Singleflight Mutex Lock active! Thundering herd collapsed to 1 DB query on cache miss.');
    } else if (solutionId === 'sol_deploy_redis') {
      const redis = this.entities.get('redis-1');
      if (redis) {
        redis.name = 'Redis 7.2 In-Memory Cluster';
        redis.resources.memory.capacityMb = 1024;
        redis.configuration.cacheHitRatio = 0.95;
      }
      this.metrics.monthlyCost += 15.0;
      this.logEvent('success', 'Redis cluster expanded. Cache hit ratio elevated to 95%.');
    } else if (solutionId === 'sol_db_read_replica') {
      const replica: Entity = {
        id: 'postgres-replica-1',
        type: 'database',
        name: 'PostgreSQL Read Replica',
        position: { x: 640, y: 100 },
        status: 'HEALTHY',
        resources: {
          cpu: { capacityCores: 2, usedCores: 0.15, utilizationPct: 7.5 },
          memory: { capacityMb: 2048, usedMb: 450, utilizationPct: 22.0 },
          connections: { current: 0, max: 20 },
        },
        configuration: {
          port: 5433,
          engine: 'PostgreSQL 16.2 (Replica)',
          maxConnections: 20,
          role: 'Read Replica',
        },
        costMonthly: 30.0,
      };

      this.entities.set(replica.id, replica);
      this.connections.set('conn-api-to-replica', {
        id: 'conn-api-to-replica',
        fromId: 'api-1',
        toId: replica.id,
        bandwidthMbps: 1000,
        latencyMs: 4,
        currentTrafficMbps: 0.4,
      });

      this.metrics.monthlyCost += 30.0;
      this.logEvent('success', 'PostgreSQL Read Replica active. Read queries split across instances.');
    }

    // Handle Scenario 4 Solutions
    if (solutionId === 'sol_vertical_billing') {
      const api = this.entities.get('api-1');
      if (api) {
        api.name = 'Billing API (4 vCPU / 8GB)';
        api.resources.cpu.capacityCores = 4;
        api.resources.memory.capacityMb = 8192;
        api.resources.connections.max = 128;
        api.configuration.maxRps = 95;
        api.costMonthly += 30.0;
      }
      this.metrics.monthlyCost += 30.0;
      this.logEvent('success', 'Billing API vertically scaled to 4 vCPUs. PDFs still render inside every request.');
    } else if (solutionId === 'sol_queue_only' || solutionId === 'sol_async_queue') {
      const queue: Entity = {
        id: 'queue-1',
        type: 'queue',
        name: 'BullMQ Job Queue (Redis)',
        position: { x: 400, y: 0 },
        status: 'HEALTHY',
        resources: {
          cpu: { capacityCores: 1, usedCores: 0.05, utilizationPct: 5.0 },
          memory: { capacityMb: 1024, usedMb: 96, utilizationPct: 9.4 },
          connections: { current: 0, max: 5000 },
        },
        configuration: {
          engine: 'Redis 7.2 / BullMQ',
          backlogPolicy: 'unbounded',
          pendingJobs: 0,
          retryLimit: 3,
        },
        costMonthly: 5.0,
      };
      this.entities.set(queue.id, queue);

      this.connections.set('conn-api-to-queue', {
        id: 'conn-api-to-queue',
        fromId: 'api-1',
        toId: 'queue-1',
        bandwidthMbps: 1000,
        latencyMs: 1,
        currentTrafficMbps: 0.2,
      });

      const api = this.entities.get('api-1');
      if (api) {
        api.configuration.jobType = 'invoice-pdf (async enqueue)';
      }

      this.metrics.monthlyCost += 5.0;

      if (solutionId === 'sol_async_queue') {
        const worker: Entity = {
          id: 'worker-1',
          type: 'worker',
          name: 'Invoice PDF Worker',
          position: { x: 660, y: 0 },
          status: 'HEALTHY',
          resources: {
            cpu: { capacityCores: 4, usedCores: 0.2, utilizationPct: 5.0 },
            memory: { capacityMb: 4096, usedMb: 380, utilizationPct: 9.3 },
            connections: { current: 0, max: 250 },
          },
          configuration: {
            runtime: 'Node.js worker process',
            concurrency: 16,
            consumes: 'queue:invoices',
            maxRps: 120,
          },
          costMonthly: 7.0,
        };
        this.entities.set(worker.id, worker);
        this.connections.set('conn-queue-to-worker', {
          id: 'conn-queue-to-worker',
          fromId: 'queue-1',
          toId: 'worker-1',
          bandwidthMbps: 1000,
          latencyMs: 1,
          currentTrafficMbps: 0.2,
        });
        this.metrics.monthlyCost += 7.0;
        this.logEvent('success', 'Async pipeline live! API responds 202 Accepted; worker drains render-invoice-pdf jobs in the background.');
      } else {
        this.logEvent('warn', 'Queue deployed with ZERO consumers attached. Jobs will accumulate forever…');
      }
    }

    this.emitSnapshot();
  }

  public getSnapshot(): SimulationSnapshot {
    return {
      tick: this.clock.getTick(),
      timeSeconds: this.clock.getSimTimeSeconds(),
      speedMultiplier: this.clock.getSpeed(),
      isPaused: this.clock.getIsPaused(),
      entities: Array.from(this.entities.values()).map((e) => ({
        ...e,
        resources: {
          cpu: { ...e.resources.cpu },
          memory: { ...e.resources.memory },
          connections: { ...e.resources.connections },
        },
      })),
      connections: Array.from(this.connections.values()),
      packets: Array.from(this.packets.values()),
      metrics: { ...this.metrics },
      events: [...this.events],
      scenario: this.activeScenario,
      scenarioState: { ...this.scenarioState },
    };
  }

  public tick(tick: number, _simTimeSeconds: number, dtSeconds: number): void {
    this.processScenarioProgress(dtSeconds);
    this.generateTraffic(dtSeconds);
    this.updatePackets(dtSeconds);
    this.updateResourcesAndHealth();
    this.updateMetrics(tick);
    this.pruneHistory(tick);

    this.emitSnapshot();
  }

  private initializeScenario1(): void {
    const userGroup: Entity = {
      id: 'user-group-1',
      type: 'user',
      name: 'Internet Visitors',
      position: { x: -380, y: 0 },
      status: 'HEALTHY',
      resources: {
        cpu: { capacityCores: 1, usedCores: 0.1, utilizationPct: 10 },
        memory: { capacityMb: 512, usedMb: 48, utilizationPct: 9.3 },
        connections: { current: 0, max: 10000 },
      },
      configuration: {
        location: 'Global (North America / Europe)',
        browserClients: 240,
        protocol: 'HTTP/2',
      },
      costMonthly: 0,
    };

    const dnsServer: Entity = {
      id: 'dns-1',
      type: 'dns',
      name: 'Authoritative DNS',
      position: { x: -100, y: 0 },
      status: 'HEALTHY',
      resources: {
        cpu: { capacityCores: 4, usedCores: 0.05, utilizationPct: 2.0 },
        memory: { capacityMb: 1024, usedMb: 95, utilizationPct: 9.2 },
        connections: { current: 0, max: 50000 },
      },
      configuration: {
        recordType: 'A Record',
        domain: 'stackworld.app',
        resolvedIp: '198.51.100.42',
        ttlSeconds: 300,
        lookupLatencyMs: 6,
      },
      costMonthly: 0,
    };

    const staticServer: Entity = {
      id: 'server-prod-1',
      type: 'static_host',
      name: 'Web Host (Nginx)',
      position: { x: 260, y: 0 },
      status: 'HEALTHY',
      resources: {
        cpu: { capacityCores: 2, usedCores: 0.15, utilizationPct: 7.5 },
        memory: { capacityMb: 2048, usedMb: 340, utilizationPct: 16.6 },
        disk: { capacityGb: 40, usedGb: 3.2 },
        connections: { current: 0, max: 64 },
      },
      configuration: {
        ipAddress: '198.51.100.42',
        domain: 'stackworld.app',
        port: 443,
        webServer: 'Nginx 1.24',
        maxRps: 45,
        baseLatencyMs: 18,
      },
      costMonthly: 15.0,
    };

    this.entities.set(userGroup.id, userGroup);
    this.entities.set(dnsServer.id, dnsServer);
    this.entities.set(staticServer.id, staticServer);

    this.connections.set('conn-user-to-dns', {
      id: 'conn-user-to-dns',
      fromId: userGroup.id,
      toId: dnsServer.id,
      bandwidthMbps: 1000,
      latencyMs: 8,
      currentTrafficMbps: 0.8,
    });

    this.connections.set('conn-dns-to-server', {
      id: 'conn-dns-to-server',
      fromId: dnsServer.id,
      toId: staticServer.id,
      bandwidthMbps: 500,
      latencyMs: 14,
      currentTrafficMbps: 1.4,
    });

    this.logEvent('info', 'Loaded Scenario 1: User → Authoritative DNS → Web Host (Nginx)');
  }

  private initializeScenario2(): void {
    const userGroup: Entity = {
      id: 'user-group-1',
      type: 'user',
      name: 'E-Commerce Shoppers',
      position: { x: -440, y: 0 },
      status: 'HEALTHY',
      resources: {
        cpu: { capacityCores: 1, usedCores: 0.1, utilizationPct: 10 },
        memory: { capacityMb: 512, usedMb: 48, utilizationPct: 9.3 },
        connections: { current: 0, max: 10000 },
      },
      configuration: {
        activeClients: 350,
        protocol: 'HTTPS/2',
      },
      costMonthly: 0,
    };

    const frontend: Entity = {
      id: 'frontend-1',
      type: 'static_host',
      name: 'Frontend (Nginx)',
      position: { x: -160, y: 0 },
      status: 'HEALTHY',
      resources: {
        cpu: { capacityCores: 2, usedCores: 0.15, utilizationPct: 7.5 },
        memory: { capacityMb: 2048, usedMb: 240, utilizationPct: 11.7 },
        connections: { current: 0, max: 200 },
      },
      configuration: {
        port: 443,
        routes: '/* -> Static SPA, /api/* -> Backend API',
      },
      costMonthly: 10.0,
    };

    const backendApi: Entity = {
      id: 'api-1',
      type: 'api',
      name: 'Order API (Node/Go)',
      position: { x: 120, y: 0 },
      status: 'HEALTHY',
      resources: {
        cpu: { capacityCores: 4, usedCores: 0.2, utilizationPct: 12.0 },
        memory: { capacityMb: 2048, usedMb: 480, utilizationPct: 23.4 },
        connections: { current: 0, max: 120 },
      },
      configuration: {
        runtime: 'Node.js 20 / Express',
        port: 8080,
        endpoint: 'GET /api/orders',
      },
      costMonthly: 15.0,
    };

    const postgres: Entity = {
      id: 'postgres-1',
      type: 'database',
      name: 'PostgreSQL 16',
      position: { x: 400, y: 0 },
      status: 'HEALTHY',
      resources: {
        cpu: { capacityCores: 2, usedCores: 0.15, utilizationPct: 7.5 },
        memory: { capacityMb: 2048, usedMb: 620, utilizationPct: 30.2 },
        connections: { current: 0, max: 20 }, // Max 20 connections triggers real pool exhaustion!
      },
      configuration: {
        port: 5432,
        engine: 'PostgreSQL 16.2',
        maxConnections: 20,
        tableRows: '500,000 orders',
        hasIndex: false,
        hasPooler: false,
      },
      costMonthly: 20.0,
    };

    this.entities.set(userGroup.id, userGroup);
    this.entities.set(frontend.id, frontend);
    this.entities.set(backendApi.id, backendApi);
    this.entities.set(postgres.id, postgres);

    this.connections.set('conn-user-to-fe', {
      id: 'conn-user-to-fe',
      fromId: userGroup.id,
      toId: frontend.id,
      bandwidthMbps: 1000,
      latencyMs: 12,
      currentTrafficMbps: 1.2,
    });

    this.connections.set('conn-fe-to-api', {
      id: 'conn-fe-to-api',
      fromId: frontend.id,
      toId: backendApi.id,
      bandwidthMbps: 1000,
      latencyMs: 4,
      currentTrafficMbps: 2.4,
    });

    this.connections.set('conn-api-to-db', {
      id: 'conn-api-to-db',
      fromId: backendApi.id,
      toId: postgres.id,
      bandwidthMbps: 1000,
      latencyMs: 2,
      currentTrafficMbps: 0.6,
    });

    this.logEvent('info', 'Loaded Scenario 2: User → Frontend → Order API → PostgreSQL 16');
  }

  private initializeScenario3(): void {
    const userGroup: Entity = {
      id: 'user-group-1',
      type: 'user',
      name: 'Flash Sale Shoppers',
      position: { x: -440, y: 0 },
      status: 'HEALTHY',
      resources: {
        cpu: { capacityCores: 1, usedCores: 0.1, utilizationPct: 10 },
        memory: { capacityMb: 512, usedMb: 48, utilizationPct: 9.3 },
        connections: { current: 0, max: 10000 },
      },
      configuration: {
        activeClients: 450,
        protocol: 'HTTPS/2',
      },
      costMonthly: 0,
    };

    const frontend: Entity = {
      id: 'frontend-1',
      type: 'static_host',
      name: 'Storefront (Nginx)',
      position: { x: -160, y: 0 },
      status: 'HEALTHY',
      resources: {
        cpu: { capacityCores: 2, usedCores: 0.15, utilizationPct: 7.5 },
        memory: { capacityMb: 2048, usedMb: 240, utilizationPct: 11.7 },
        connections: { current: 0, max: 300 },
      },
      configuration: {
        port: 443,
        routes: '/* -> Catalog SPA, /api/* -> Backend API',
      },
      costMonthly: 10.0,
    };

    const backendApi: Entity = {
      id: 'api-1',
      type: 'api',
      name: 'Catalog API (Node.js)',
      position: { x: 100, y: 0 },
      status: 'HEALTHY',
      resources: {
        cpu: { capacityCores: 4, usedCores: 0.2, utilizationPct: 12.0 },
        memory: { capacityMb: 2048, usedMb: 420, utilizationPct: 20.5 },
        connections: { current: 0, max: 200 },
      },
      configuration: {
        runtime: 'Node.js 20 / Express',
        port: 8080,
        endpoint: 'GET /api/products/featured',
      },
      costMonthly: 15.0,
    };

    const redis: Entity = {
      id: 'redis-1',
      type: 'redis',
      name: 'Redis 7.2 Cache',
      position: { x: 380, y: -100 },
      status: 'HEALTHY',
      resources: {
        cpu: { capacityCores: 2, usedCores: 0.05, utilizationPct: 3.5 },
        memory: { capacityMb: 256, usedMb: 42, utilizationPct: 16.4 },
        connections: { current: 0, max: 2000 },
      },
      configuration: {
        port: 6379,
        version: 'Redis 7.2-alpine',
        evictionPolicy: 'volatile-lru',
        ttlSeconds: 60,
        cacheHitRatio: 0.90,
        cachedKeysCount: 1420,
      },
      costMonthly: 10.0,
    };

    const postgres: Entity = {
      id: 'postgres-1',
      type: 'database',
      name: 'PostgreSQL 16 (Primary)',
      position: { x: 380, y: 100 },
      status: 'HEALTHY',
      resources: {
        cpu: { capacityCores: 2, usedCores: 0.15, utilizationPct: 7.5 },
        memory: { capacityMb: 2048, usedMb: 580, utilizationPct: 28.3 },
        connections: { current: 0, max: 20 },
      },
      configuration: {
        port: 5432,
        engine: 'PostgreSQL 16.2',
        maxConnections: 20,
        tableRows: '150,000 catalog items',
        hasIndex: true,
      },
      costMonthly: 20.0,
    };

    this.entities.set(userGroup.id, userGroup);
    this.entities.set(frontend.id, frontend);
    this.entities.set(backendApi.id, backendApi);
    this.entities.set(redis.id, redis);
    this.entities.set(postgres.id, postgres);

    this.connections.set('conn-user-to-fe', {
      id: 'conn-user-to-fe',
      fromId: userGroup.id,
      toId: frontend.id,
      bandwidthMbps: 1000,
      latencyMs: 10,
      currentTrafficMbps: 1.2,
    });

    this.connections.set('conn-fe-to-api', {
      id: 'conn-fe-to-api',
      fromId: frontend.id,
      toId: backendApi.id,
      bandwidthMbps: 1000,
      latencyMs: 4,
      currentTrafficMbps: 2.0,
    });

    this.connections.set('conn-api-to-redis', {
      id: 'conn-api-to-redis',
      fromId: backendApi.id,
      toId: redis.id,
      bandwidthMbps: 1000,
      latencyMs: 1,
      currentTrafficMbps: 1.8,
    });

    this.connections.set('conn-api-to-db', {
      id: 'conn-api-to-db',
      fromId: backendApi.id,
      toId: postgres.id,
      bandwidthMbps: 1000,
      latencyMs: 4,
      currentTrafficMbps: 0.4,
    });

    this.logEvent('info', 'Loaded Scenario 3: Flash Sale Storefront → API → Redis 7.2 & PostgreSQL');
  }

  private initializeScenario4(): void {
    const userGroup: Entity = {
      id: 'user-group-1',
      type: 'user',
      name: 'Checkout Buyers',
      position: { x: -440, y: 0 },
      status: 'HEALTHY',
      resources: {
        cpu: { capacityCores: 1, usedCores: 0.1, utilizationPct: 10 },
        memory: { capacityMb: 512, usedMb: 48, utilizationPct: 9.3 },
        connections: { current: 0, max: 10000 },
      },
      configuration: {
        activeClients: 380,
        protocol: 'HTTPS/2',
      },
      costMonthly: 0,
    };

    const frontend: Entity = {
      id: 'frontend-1',
      type: 'static_host',
      name: 'Checkout (Nginx)',
      position: { x: -160, y: 0 },
      status: 'HEALTHY',
      resources: {
        cpu: { capacityCores: 2, usedCores: 0.15, utilizationPct: 7.5 },
        memory: { capacityMb: 2048, usedMb: 240, utilizationPct: 11.7 },
        connections: { current: 0, max: 300 },
      },
      configuration: {
        port: 443,
        routes: '/* -> Storefront SPA, /api/* -> Billing API',
      },
      costMonthly: 10.0,
    };

    // Slow synchronous endpoint: each request pins a worker while rendering a PDF.
    const backendApi: Entity = {
      id: 'api-1',
      type: 'api',
      name: 'Billing API (Node.js)',
      position: { x: 160, y: 0 },
      status: 'HEALTHY',
      resources: {
        cpu: { capacityCores: 2, usedCores: 0.2, utilizationPct: 10.0 },
        memory: { capacityMb: 2048, usedMb: 520, utilizationPct: 25.4 },
        connections: { current: 0, max: 30 },
      },
      configuration: {
        runtime: 'Node.js 20 / Express',
        port: 8080,
        endpoint: 'POST /api/invoices',
        jobType: 'invoice-pdf (sync)',
        maxRps: 16,
        baseLatencyMs: 900,
      },
      costMonthly: 15.0,
    };

    const postgres: Entity = {
      id: 'postgres-1',
      type: 'database',
      name: 'PostgreSQL 16',
      position: { x: 120, y: 200 },
      status: 'HEALTHY',
      resources: {
        cpu: { capacityCores: 2, usedCores: 0.1, utilizationPct: 5.0 },
        memory: { capacityMb: 2048, usedMb: 540, utilizationPct: 26.4 },
        connections: { current: 0, max: 20 },
      },
      configuration: {
        port: 5432,
        engine: 'PostgreSQL 16.2',
        maxConnections: 20,
        tableRows: '80,000 invoices',
        hasIndex: true,
      },
      costMonthly: 20.0,
    };

    this.entities.set(userGroup.id, userGroup);
    this.entities.set(frontend.id, frontend);
    this.entities.set(backendApi.id, backendApi);
    this.entities.set(postgres.id, postgres);

    this.connections.set('conn-user-to-fe', {
      id: 'conn-user-to-fe',
      fromId: userGroup.id,
      toId: frontend.id,
      bandwidthMbps: 1000,
      latencyMs: 10,
      currentTrafficMbps: 1.2,
    });

    this.connections.set('conn-fe-to-api', {
      id: 'conn-fe-to-api',
      fromId: frontend.id,
      toId: backendApi.id,
      bandwidthMbps: 1000,
      latencyMs: 3,
      currentTrafficMbps: 2.0,
    });

    this.connections.set('conn-api-to-db', {
      id: 'conn-api-to-db',
      fromId: backendApi.id,
      toId: postgres.id,
      bandwidthMbps: 1000,
      latencyMs: 2,
      currentTrafficMbps: 0.5,
    });

    this.logEvent('info', 'Loaded Scenario 4: Buyer → Checkout → Billing API (sync PDF jobs) → PostgreSQL');
  }

  private processScenarioProgress(dtSeconds: number): void {
    const simTime = this.clock.getSimTimeSeconds();

    if (this.scenarioState.currentStageId === 'stage_baseline' && simTime >= 10) {
      this.scenarioState.currentStageId = 'stage_surge';
      this.targetRps = this.activeScenario.stages[1].targetRps;
      this.logEvent('warn', `🚨 ${this.activeScenario.stages[1].instructions}`);
    }

    if (this.scenarioState.currentStageId === 'stage_surge') {
      if (this.activeScenario.id === 'scenario-3-redis-cache') {
        const redis = this.entities.get('redis-1');
        if (redis && !this.scenarioState.selectedSolutionId) {
          redis.configuration.cacheHitRatio = 0.05; // Hot key expired! 95% miss triggers stampede
        }
        const db = this.entities.get('postgres-1');
        if (db && (db.resources.connections.current >= 14 || db.resources.cpu.utilizationPct > 65)) {
          this.scenarioState.currentStageId = 'stage_degraded';
          this.scenarioState.isSolutionModalOpen = true;
          this.logEvent('error', '⚠️ Cache Stampede detected! Expired catalog key triggered thundering herd on PostgreSQL.');
        }
      } else if (this.activeScenario.id === 'scenario-2-backend-db') {
        const db = this.entities.get('postgres-1');
        if (db && (db.resources.connections.current >= 16 || db.status === 'OVERLOADED' || db.status === 'FAILING')) {
          this.scenarioState.currentStageId = 'stage_degraded';
          this.scenarioState.isSolutionModalOpen = true;
          this.logEvent('error', '⚠️ PostgreSQL connection pool saturated (20/20)! Unindexed query causing bottleneck.');
        }
      } else if (this.activeScenario.id === 'scenario-4-job-queues') {
        const api = this.entities.get('api-1');
        if (api && (api.status === 'OVERLOADED' || api.status === 'FAILING')) {
          this.scenarioState.currentStageId = 'stage_degraded';
          this.scenarioState.isSolutionModalOpen = true;
          this.logEvent('error', '⚠️ Billing API pinned by inline PDF jobs! Request workers exhausted, checkout timing out.');
        }
      } else {
        const server = this.entities.get('server-prod-1');
        if (server && (server.status === 'OVERLOADED' || server.status === 'FAILING' || server.resources.cpu.utilizationPct > 80)) {
          this.scenarioState.currentStageId = 'stage_degraded';
          this.scenarioState.isSolutionModalOpen = true;
          this.logEvent('error', '⚠️ Server overloaded! Capacity exceeded. Please choose an architectural remedy.');
        }
      }
    }

    if (this.scenarioState.currentStageId === 'stage_solution_applied') {
      if (this.metrics.clusterHealth === 'HEALTHY' || this.metrics.clusterHealth === 'DEGRADED') {
        this.scenarioState.sustainedHealthySeconds += dtSeconds;
        if (this.scenarioState.sustainedHealthySeconds >= this.activeScenario.successConditions.minSustainedSeconds) {
          this.scenarioState.currentStageId = 'stage_victory';
          this.scenarioState.isVictoryModalOpen = true;
          this.calculateVictoryScore();
          this.logEvent('success', '🏆 SCENARIO COMPLETE! Production requirements passed.');
        }
      } else {
        this.scenarioState.sustainedHealthySeconds = Math.max(0, this.scenarioState.sustainedHealthySeconds - dtSeconds * 0.5);
      }
    }
  }

  private calculateVictoryScore(): void {
    let grade: 'S' | 'A' | 'B' | 'C' = 'A';
    let reliability = 90;
    let costEff = 85;
    let complexity = 80;
    let summary = '';

    if (this.activeScenario.id === 'scenario-4-job-queues') {
      if (this.scenarioState.selectedSolutionId === 'sol_async_queue') {
        grade = 'S';
        reliability = 98;
        costEff = 95;
        complexity = 90;
        summary = 'Textbook async offload! Checkout now responds with 202 in milliseconds while workers drain PDF jobs at their own pace. The queue absorbs bursts instead of the API cracking.';
      } else if (this.scenarioState.selectedSolutionId === 'sol_vertical_billing') {
        grade = 'B';
        reliability = 80;
        costEff = 55;
        complexity = 92;
        summary = 'The bigger box bought headroom, but every checkout still waits for a synchronous PDF. Next traffic bump means another expensive resize — and the single point of failure remains.';
      } else if (this.scenarioState.selectedSolutionId === 'sol_queue_only') {
        grade = 'C';
        reliability = 40;
        costEff = 70;
        complexity = 88;
        summary = 'Green dashboards, broken promises: the queue accepted every job but no worker ever processed them. A queue without consumers hides the failure — it does not solve it. Check the backlog!';
      } else {
        grade = 'C';
        reliability = 70;
        costEff = 60;
        complexity = 70;
        summary = 'Incident resolved, but the architecture still leaves slow work on the request path.';
      }
    } else if (this.activeScenario.id === 'scenario-3-redis-cache') {
      if (this.scenarioState.selectedSolutionId === 'sol_mutex_stampede_lock') {
        grade = 'S';
        reliability = 99;
        costEff = 100;
        complexity = 90;
        summary = 'Masterful engineering! Singleflight Mutex locking collapsed concurrent cache misses to 1 query, completely eliminating the thundering herd at $0 extra cost.';
      } else if (this.scenarioState.selectedSolutionId === 'sol_deploy_redis') {
        grade = 'A';
        reliability = 92;
        costEff = 85;
        complexity = 85;
        summary = 'High performance! Redis absorbed 90% of traffic from RAM in 1ms, though lock guards are still best practice for hot key expiry.';
      } else {
        grade = 'B';
        reliability = 88;
        costEff = 60;
        complexity = 75;
        summary = 'Horizontal scaling doubled read throughput, but disk reads are still 15x slower than in-memory caching and carry recurring VM costs.';
      }
    } else if (this.activeScenario.id === 'scenario-2-backend-db') {
      if (this.scenarioState.selectedSolutionId === 'sol_add_db_index') {
        grade = 'S';
        reliability = 99;
        costEff = 100;
        complexity = 95;
        summary = 'Flawless engineering! A B-Tree index eliminated full table scans at $0 cost, instantly cutting query latency by 99.6%.';
      } else if (this.scenarioState.selectedSolutionId === 'sol_pgbouncer') {
        grade = 'B';
        reliability = 92;
        costEff = 80;
        complexity = 78;
        summary = 'Protected connections from dropping, but did not cure the slow query itself. Good layer, but index was needed.';
      } else {
        grade = 'C';
        reliability = 78;
        costEff = 55;
        complexity = 80;
        summary = 'Bruteforcing with larger hardware (+ $35/mo) temporarily accommodated the scan, but the database will saturate again as data grows.';
      }
    } else {
      if (this.scenarioState.selectedSolutionId === 'sol_add_cdn') {
        grade = 'S';
        reliability = 98;
        costEff = 95;
        complexity = 90;
        summary = 'Optimal static architecture! Edge CDN caches 80% of requests, protecting origin server for only +$5/mo.';
      } else if (this.scenarioState.selectedSolutionId === 'sol_load_balancer') {
        grade = 'A';
        reliability = 99;
        costEff = 72;
        complexity = 75;
        summary = 'Robust enterprise architecture. High availability with zero single-point-of-failure, though higher monthly cost.';
      } else {
        grade = 'B';
        reliability = 82;
        costEff = 75;
        complexity = 95;
        summary = 'Simple & fast to deploy, but leaves a single point of failure and higher recurring hardware costs.';
      }
    }

    this.scenarioState.score = {
      grade,
      reliabilityScore: reliability,
      costEfficiencyScore: costEff,
      complexityScore: complexity,
      summary,
    };
  }

  private generateTraffic(dtSeconds: number): void {
    this.pendingRequestAccumulator += this.targetRps * dtSeconds;

    const user = this.entities.get('user-group-1');
    if (!user) return;

    while (this.pendingRequestAccumulator >= 1.0) {
      this.pendingRequestAccumulator -= 1.0;
      this.metrics.requestsTotal++;
      this.requestCounter++;

      const isDbScenario = this.activeScenario.id === 'scenario-2-backend-db';
      const isCacheScenario = this.activeScenario.id === 'scenario-3-redis-cache';
      const isQueueScenario = this.activeScenario.id === 'scenario-4-job-queues';

      let requestPath: string[];
      let packetType: Packet['type'] = 'request';

      if (isCacheScenario) {
        requestPath = ['user-group-1', 'frontend-1', 'api-1', 'redis-1'];
      } else if (isQueueScenario) {
        // Async pipeline: once workers are attached, requests traverse api -> queue -> worker.
        requestPath = ['user-group-1', 'frontend-1', 'api-1'];
        if (this.entities.has('worker-1')) {
          requestPath.push('queue-1', 'worker-1');
        } else if (this.entities.has('queue-1')) {
          requestPath.push('queue-1');
        }
      } else if (isDbScenario) {
        requestPath = ['user-group-1', 'frontend-1', 'api-1', 'postgres-1'];
      } else {
        const dns = this.entities.get('dns-1');
        requestPath = [user.id, dns ? dns.id : 'server-prod-1'];

        const hasCdn = this.entities.has('cdn-edge-1');
        const hasLb = this.entities.has('lb-1');

        if (hasCdn) {
          requestPath.push('cdn-edge-1');
        } else if (hasLb) {
          requestPath.push('lb-1');
          const targetServer = this.requestCounter % 2 === 0 ? 'server-prod-1' : 'server-prod-2';
          requestPath.push(targetServer);
        } else {
          requestPath.push('server-prod-1');
        }
      }

      const packetId = `pkt-${this.nextPacketId++}`;
      const packet: Packet = {
        id: packetId,
        fromId: requestPath[0],
        toId: requestPath[1],
        type: packetType,
        path: requestPath,
        currentHopIndex: 0,
        progress: 0.0,
        speed: (isDbScenario || isCacheScenario) ? 3.4 : 2.8,
        status: 'in_flight',
        sizeKb: 1.2,
        createdAtTick: this.clock.getTick(),
      };

      this.packets.set(packetId, packet);
    }
  }

  private updatePackets(dtSeconds: number): void {
    const packetsToRemove: string[] = [];

    for (const [id, packet] of this.packets) {
      packet.progress += packet.speed * dtSeconds;

      if (packet.progress >= 1.0) {
        packet.progress = 1.0;

        if (packet.type === 'request') {
          const nextHopIdx = packet.currentHopIndex + 1;
          const currentTargetId = packet.path[nextHopIdx];

          // Scenario 4: Job accepted by API -> hand off to queue, respond 202 immediately
          if (currentTargetId === 'queue-1' && this.entities.has('worker-1')) {
            packet.type = 'response';
            packet.isCached = true;
            packet.jobAccepted = true;
            packet.path = ['api-1', 'frontend-1', 'user-group-1'];
            packet.currentHopIndex = 0;
            packet.fromId = 'api-1';
            packet.toId = 'frontend-1';
            packet.progress = 0.0;
            packet.speed = 3.6;

            // The actual PDF rendering travels queue -> worker in the background
            const queue = this.entities.get('queue-1');
            const worker = this.entities.get('worker-1');
            if (queue) {
              queue.configuration.pendingJobs = Number(queue.configuration.pendingJobs ?? 0) + 1;
            }
            if (worker) {
              worker.resources.connections.current++;
            }
            const jobPacket: Packet = {
              id: `pkt-${this.nextPacketId++}`,
              fromId: 'queue-1',
              toId: 'worker-1',
              type: 'cache_query',
              path: ['queue-1', 'worker-1'],
              currentHopIndex: 0,
              progress: 0.0,
              speed: 1.8,
              status: 'in_flight',
              sizeKb: 0.8,
              createdAtTick: packet.createdAtTick,
              sqlQuery: 'JOB render-invoice-pdf',
            };
            this.packets.set(jobPacket.id, jobPacket);
            continue;
          }

          // Scenario 1: CDN Edge Cache Hit
          if (currentTargetId === 'cdn-edge-1') {
            const isCacheHit = this.rng() < 0.8;
            if (isCacheHit) {
              const reversePath = packet.path.slice(0, nextHopIdx + 1).reverse();
              packet.type = 'response';
              packet.isCached = true;
              packet.path = reversePath;
              packet.currentHopIndex = 0;
              packet.fromId = reversePath[0];
              packet.toId = reversePath[1];
              packet.progress = 0.0;
              packet.speed = 3.6;
              continue;
            } else {
              packet.currentHopIndex = nextHopIdx;
              packet.fromId = 'cdn-edge-1';
              packet.toId = 'server-prod-1';
              packet.progress = 0.0;
              continue;
            }
          }

          // Scenario 3: Redis In-Memory Cache Hit or Miss
          if (currentTargetId === 'redis-1') {
            const redis = this.entities.get('redis-1');
            const hitRatio = (redis?.configuration.cacheHitRatio as number) ?? 0.90;
            const isHit = this.rng() < hitRatio;

            if (isHit) {
              // Cache Hit! Returned in 1ms directly from RAM
              packet.type = 'cache_hit';
              packet.isCached = true;
              packet.path = ['redis-1', 'api-1', 'frontend-1', 'user-group-1'];
              packet.currentHopIndex = 0;
              packet.fromId = 'redis-1';
              packet.toId = 'api-1';
              packet.progress = 0.0;
              packet.speed = 4.6;
              continue;
            } else {
              // Cache Miss!
              const api = this.entities.get('api-1');
              const hasMutexLock = Boolean(api?.configuration.hasMutexLock);
              const hasReplica = this.entities.has('postgres-replica-1');
              const targetDb = hasReplica && (this.requestCounter % 2 === 0) ? 'postgres-replica-1' : 'postgres-1';

              if (hasMutexLock && this.rng() < 0.94) {
                // Mutex Lock: Deduplicate concurrent requests. They wait briefly and receive populated cache result!
                packet.type = 'cache_hit';
                packet.isCached = true;
                packet.path = ['redis-1', 'api-1', 'frontend-1', 'user-group-1'];
                packet.currentHopIndex = 0;
                packet.fromId = 'redis-1';
                packet.toId = 'api-1';
                packet.progress = 0.0;
                packet.speed = 4.2;
                continue;
              }

              // Forward query to PostgreSQL
              packet.type = 'sql_query';
              packet.sqlQuery = 'SELECT * FROM products WHERE featured = true';
              packet.path = ['redis-1', 'api-1', targetDb];
              packet.currentHopIndex = 1;
              packet.fromId = 'api-1';
              packet.toId = targetDb;
              packet.progress = 0.0;
              packet.speed = 3.2;

              const db = this.entities.get(targetDb);
              this.handleDbArrival(packet, db);
              continue;
            }
          }

          // Scenario 2: API -> Database SQL Query
          if (currentTargetId === 'postgres-1' || currentTargetId === 'postgres-replica-1') {
            packet.type = 'sql_query';
            packet.sqlQuery = 'SELECT * FROM orders WHERE status = ?';
            packet.currentHopIndex = nextHopIdx;
            packet.fromId = packet.path[nextHopIdx - 1]; // api or pgbouncer
            packet.toId = currentTargetId;
            packet.progress = 0.0;

            const db = this.entities.get(currentTargetId);
            const isSlow = !db?.configuration.hasIndex;
            packet.speed = isSlow ? 0.8 : 3.6; // Slow queries creep across the link
            this.handleDbArrival(packet, db);
            continue;
          }

          // Intermediate hops
          if (nextHopIdx < packet.path.length - 1) {
            packet.currentHopIndex = nextHopIdx;
            packet.fromId = packet.path[nextHopIdx];
            packet.toId = packet.path[nextHopIdx + 1];
            packet.progress = 0.0;
            continue;
          }

          // Final server reached
          packetsToRemove.push(id);
          this.handleRequestArrival(packet, currentTargetId);
        } else if (packet.type === 'cache_query') {
          // Background job finished processing on the worker
          packetsToRemove.push(id);
          const queue = this.entities.get('queue-1');
          const worker = this.entities.get('worker-1');
          if (queue) {
            queue.configuration.pendingJobs = Math.max(0, Number(queue.configuration.pendingJobs ?? 1) - 1);
          }
          if (worker && worker.resources.connections.current > 0) {
            worker.resources.connections.current--;
          }
        } else if (packet.type === 'sql_query') {
          // SQL query finished executing on database -> return sql_result to API
          const targetDbId = packet.toId;
          packet.type = 'sql_result';
          packet.fromId = targetDbId;
          packet.toId = 'api-1';
          packet.progress = 0.0;
          packet.speed = 3.2;

          const db = this.entities.get(targetDbId);
          if (db && db.resources.connections.current > 0) {
            db.resources.connections.current--;
          }
        } else if (packet.type === 'sql_result') {
          // SQL result returned to API -> API populates Redis and responds to User
          if (this.activeScenario.id === 'scenario-3-redis-cache') {
            const redis = this.entities.get('redis-1');
            if (redis && (redis.configuration.cacheHitRatio as number) < 0.5) {
              if (this.scenarioState.selectedSolutionId === 'sol_mutex_stampede_lock') {
                redis.configuration.cacheHitRatio = 0.98;
              }
            }
          }
          packet.type = 'response';
          packet.path = ['api-1', 'frontend-1', 'user-group-1'];
          packet.currentHopIndex = 0;
          packet.fromId = 'api-1';
          packet.toId = 'frontend-1';
          packet.progress = 0.0;
          packet.speed = 3.2;
          continue;
        } else if (packet.type === 'response' || packet.type === 'cache_hit') {
          const nextHopIdx = packet.currentHopIndex + 1;
          if (nextHopIdx < packet.path.length - 1) {
            packet.currentHopIndex = nextHopIdx;
            packet.fromId = packet.path[nextHopIdx];
            packet.toId = packet.path[nextHopIdx + 1];
            packet.progress = 0.0;
            continue;
          }

          // Response arrived back to User
          packetsToRemove.push(id);
          this.handleResponseArrival(packet);
        }
      }
    }

    for (const id of packetsToRemove) {
      this.packets.delete(id);
    }
  }

  private handleDbArrival(packet: Packet, db?: Entity): void {
    if (!db) return;
    db.resources.connections.current++;

    const isPoolExhausted = db.resources.connections.current > db.resources.connections.max;
    if (isPoolExhausted) {
      packet.status = 'dropped';
      this.logEvent('error', 'FATAL: PostgreSQL connection slots exhausted (20/20 clients connected)');
    }
  }

  private handleRequestArrival(packet: Packet, serverId: string): void {
    const server = this.entities.get(serverId) || this.entities.get('server-prod-1');
    const user = this.entities.get('user-group-1');
    if (!server || !user) return;

    server.resources.connections.current++;

    // Queue-only trap: jobs land on the queue but nothing drains them — backlog grows.
    if (server.type === 'queue') {
      server.configuration.pendingJobs = Number(server.configuration.pendingJobs ?? 0) + 1;
    }

    const isConnectionExhausted = server.resources.connections.current > server.resources.connections.max;
    const isCpuCrash = server.resources.cpu.utilizationPct > 100;
    const failed = isConnectionExhausted || isCpuCrash;

    const reversePath = [...packet.path].reverse();
    const respId = `pkt-${this.nextPacketId++}`;
    const responsePacket: Packet = {
      id: respId,
      fromId: reversePath[0],
      toId: reversePath[1],
      type: 'response',
      path: reversePath,
      currentHopIndex: 0,
      progress: 0.0,
      speed: failed ? 1.6 : 2.8,
      status: failed ? 'dropped' : 'in_flight',
      sizeKb: failed ? 0.3 : 18.4,
      createdAtTick: packet.createdAtTick,
    };

    this.packets.set(respId, responsePacket);
  }

  private handleResponseArrival(packet: Packet): void {
    // The first node of a response path is the server that handled the request.
    // Release ITS socket (packet.fromId at arrival time is the penultimate hop).
    const server = this.entities.get(packet.path[0]);
    if (server && server.resources.connections.current > 0) {
      server.resources.connections.current--;
    }

    const currentTick = this.clock.getTick();
    const flightTicks = currentTick - packet.createdAtTick;
    const latencyMs = Math.round(flightTicks * this.clock.tickDurationMs);

    const isSuccess = packet.status !== 'dropped';
    if (isSuccess) {
      this.metrics.requestsSuccessful++;
    } else {
      this.metrics.requestsFailed++;
      this.logEvent('error', `HTTP Error 500: Database/Server failure (${latencyMs}ms)`);
    }

    this.completedRequestsWindow.push({
      tick: currentTick,
      latencyMs,
      success: isSuccess,
    });
  }

  private updateResourcesAndHealth(): void {
    let worstHealth: HealthStatus = 'HEALTHY';

    // 1. Update Database Nodes
    const dbs = Array.from(this.entities.values()).filter((e) => e.type === 'database');
    for (const db of dbs) {
      const activeConn = db.resources.connections.current;
      const maxConn = db.resources.connections.max;
      const hasIndex = db.configuration.hasIndex;

      // Unindexed slow queries cause high CPU and RAM
      const targetCpu = hasIndex ? 8.0 + (activeConn / maxConn) * 20 : 25.0 + (activeConn / maxConn) * 85;
      db.resources.cpu.utilizationPct += (Math.min(105, targetCpu) - db.resources.cpu.utilizationPct) * 0.2;
      db.resources.cpu.usedCores = Number(((db.resources.cpu.utilizationPct / 100) * db.resources.cpu.capacityCores).toFixed(2));

      if (activeConn >= maxConn || db.resources.cpu.utilizationPct > 85) {
        db.status = 'FAILING';
        worstHealth = 'FAILING';
      } else if (activeConn >= maxConn * 0.8 || db.resources.cpu.utilizationPct > 70) {
        db.status = 'OVERLOADED';
        if (worstHealth !== 'FAILING') worstHealth = 'OVERLOADED';
      } else {
        db.status = 'HEALTHY';
      }
    }

    // 2. Update Web Host, API & Worker Nodes
    const servers = Array.from(this.entities.values()).filter((e) => e.type === 'static_host' || e.type === 'api' || e.type === 'worker');
    for (const server of servers) {
      const activeReqs = server.resources.connections.current;
      const maxCapacity = (server.configuration.maxRps as number) || 45;

      const baseCpu = 4.0;
      const dynamicCpu = (activeReqs / maxCapacity) * 88.0;
      const targetCpuPct = Math.min(115, Math.round(baseCpu + dynamicCpu));

      server.resources.cpu.utilizationPct += (targetCpuPct - server.resources.cpu.utilizationPct) * 0.22;
      server.resources.cpu.usedCores = Number(((server.resources.cpu.utilizationPct / 100) * server.resources.cpu.capacityCores).toFixed(2));

      const cpu = server.resources.cpu.utilizationPct;
      let newStatus: HealthStatus = 'HEALTHY';

      if (cpu >= 100 || activeReqs > server.resources.connections.max) {
        newStatus = 'FAILING';
      } else if (cpu >= 80) {
        newStatus = 'OVERLOADED';
      } else if (cpu >= 65) {
        newStatus = 'DEGRADED';
      }

      server.status = newStatus;
      if (newStatus === 'FAILING') worstHealth = 'FAILING';
      else if (newStatus === 'OVERLOADED' && worstHealth !== 'FAILING') worstHealth = 'OVERLOADED';
      else if (newStatus === 'DEGRADED' && worstHealth === 'HEALTHY') worstHealth = 'DEGRADED';
    }

    // 3. Update Redis Cache Node
    const redis = this.entities.get('redis-1');
    if (redis) {
      const activeKeys = (redis.configuration.cachedKeysCount as number) || 1420;
      redis.resources.memory.usedMb = Math.min(
        redis.resources.memory.capacityMb,
        Math.round(28 + activeKeys * 0.01 + (this.metrics.currentRps || 0) * 0.4)
      );
      redis.resources.memory.utilizationPct = Number(
        ((redis.resources.memory.usedMb / redis.resources.memory.capacityMb) * 100).toFixed(1)
      );
      redis.resources.cpu.utilizationPct = Math.min(
        100,
        Number((2.5 + (this.metrics.currentRps || 0) * 0.2).toFixed(1))
      );
      redis.resources.cpu.usedCores = Number(
        ((redis.resources.cpu.utilizationPct / 100) * redis.resources.cpu.capacityCores).toFixed(2)
      );
    }

    this.metrics.clusterHealth = worstHealth;
  }

  private updateMetrics(currentTick: number): void {
    const windowTicks = 60;
    const recent = this.completedRequestsWindow.filter((r) => currentTick - r.tick <= windowTicks);

    if (recent.length > 0) {
      const windowSeconds = windowTicks * this.clock.tickDurationSeconds;
      this.metrics.currentRps = Number((recent.length / windowSeconds).toFixed(1));

      const totalLat = recent.reduce((sum, r) => sum + r.latencyMs, 0);
      this.metrics.averageLatencyMs = Math.round(totalLat / recent.length);
    } else {
      this.metrics.currentRps = 0;
    }
  }

  private pruneHistory(currentTick: number): void {
    const maxWindowTicks = 120;
    this.completedRequestsWindow = this.completedRequestsWindow.filter((r) => currentTick - r.tick <= maxWindowTicks);

    if (this.events.length > 50) {
      this.events = this.events.slice(-50);
    }
  }

  private logEvent(level: 'info' | 'warn' | 'error' | 'success', message: string, entityId?: string): void {
    const simTime = this.clock.getSimTimeSeconds();
    const mins = Math.floor(simTime / 60).toString().padStart(2, '0');
    const secs = Math.floor(simTime % 60).toString().padStart(2, '0');
    const formatted = `${mins}:${secs}`;

    const event: SimulationEvent = {
      id: `evt-${this.nextEventId++}`,
      tick: this.clock.getTick(),
      simTimeFormatted: formatted,
      level,
      message,
      entityId,
    };

    this.events.push(event);
  }

  private emitSnapshot(): void {
    const snapshot = this.getSnapshot();
    for (const listener of this.snapshotListeners) {
      try {
        listener(snapshot);
      } catch (err) {
        console.error('SimulationEngine listener error:', err);
      }
    }
  }
}
