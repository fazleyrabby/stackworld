/**
 * SimulationEngine.ts
 * 
 * The core deterministic simulation engine for StackWorld.
 * STRICT RULE: Zero React or UI dependencies.
 * 
 * Runs on discrete ticks (typically 20 Hz / 50ms) driven by SimulationClock.
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

export interface SimulationEngineConfig {
  seed?: number;
  initialRps?: number;
}

export class SimulationEngine {
  public readonly clock: SimulationClock;
  
  private entities: Map<string, Entity> = new Map();
  private connections: Map<string, Connection> = new Map();
  private packets: Map<string, Packet> = new Map();
  private events: SimulationEvent[] = [];
  
  private metrics: SimulationMetrics = {
    requestsTotal: 0,
    requestsSuccessful: 0,
    requestsFailed: 0,
    currentRps: 0,
    averageLatencyMs: 25,
    clusterHealth: 'HEALTHY',
    monthlyCost: 20.0,
  };

  private targetRps: number = 6;
  private pendingRequestAccumulator: number = 0;
  private nextPacketId: number = 1;
  private nextEventId: number = 1;
  private completedRequestsWindow: { tick: number; latencyMs: number; success: boolean }[] = [];

  // Snapshot listeners
  private snapshotListeners: Set<(snapshot: SimulationSnapshot) => void> = new Set();

  constructor(config: SimulationEngineConfig = {}) {
    this.clock = new SimulationClock(20);
    this.targetRps = config.initialRps ?? 6;

    this.initializeDefaultWorld();

    // Subscribe to clock ticks
    this.clock.subscribe((tick, simTimeSeconds, dtSeconds) => {
      this.tick(tick, simTimeSeconds, dtSeconds);
    });
  }

  public subscribe(listener: (snapshot: SimulationSnapshot) => void): () => void {
    this.snapshotListeners.add(listener);
    // Send immediate snapshot
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
    this.targetRps = Math.max(0, rps);
    this.logEvent('info', `Traffic target adjusted to ${this.targetRps} req/s`);
    this.emitSnapshot();
  }

  public getTargetRps(): number {
    return this.targetRps;
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

  public getSnapshot(): SimulationSnapshot {
    return {
      tick: this.clock.getTick(),
      timeSeconds: this.clock.getSimTimeSeconds(),
      speedMultiplier: this.clock.getSpeed(),
      isPaused: this.clock.getIsPaused(),
      entities: Array.from(this.entities.values()).map(e => ({
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
    };
  }

  /**
   * Main simulation tick (called deterministically 20 times per sim second)
   */
  public tick(tick: number, _simTimeSeconds: number, dtSeconds: number): void {
    this.generateTraffic(dtSeconds);
    this.updatePackets(dtSeconds);
    this.updateResourcesAndHealth();
    this.updateMetrics(tick);
    this.pruneHistory(tick);

    this.emitSnapshot();
  }

  private initializeDefaultWorld(): void {
    const userGroup: Entity = {
      id: 'user-group-1',
      type: 'user',
      name: 'Internet Users',
      position: { x: -260, y: 0 },
      status: 'HEALTHY',
      resources: {
        cpu: { capacityCores: 1, usedCores: 0.1, utilizationPct: 10 },
        memory: { capacityMb: 512, usedMb: 48, utilizationPct: 9.3 },
        connections: { current: 12, max: 1000 },
      },
      configuration: {
        location: 'Global (North America / Europe)',
        activeClients: 120,
        protocol: 'HTTP/2',
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
        connections: { current: 12, max: 64 },
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
    this.entities.set(staticServer.id, staticServer);

    const primaryLink: Connection = {
      id: 'conn-user-to-server',
      fromId: userGroup.id,
      toId: staticServer.id,
      bandwidthMbps: 100,
      latencyMs: 22,
      currentTrafficMbps: 1.4,
    };

    this.connections.set(primaryLink.id, primaryLink);

    this.logEvent('info', 'Simulation initialized: 1 Static Host, 1 User Group.');
  }

  private generateTraffic(dtSeconds: number): void {
    // Accumulate requests based on target RPS
    this.pendingRequestAccumulator += this.targetRps * dtSeconds;

    const server = this.entities.get('server-prod-1');
    const user = this.entities.get('user-group-1');
    if (!server || !user) return;

    while (this.pendingRequestAccumulator >= 1.0) {
      this.pendingRequestAccumulator -= 1.0;
      this.metrics.requestsTotal++;

      // Create request packet from User -> Server
      const packetId = `pkt-${this.nextPacketId++}`;
      const packet: Packet = {
        id: packetId,
        fromId: user.id,
        toId: server.id,
        type: 'request',
        progress: 0.0,
        // Traversal speed (takes ~0.50s visual flight time)
        speed: 2.0,
        status: 'in_flight',
        sizeKb: 1.2,
        createdAtTick: this.clock.getTick(),
      };

      this.packets.set(packetId, packet);
      server.resources.connections.current++;
    }
  }

  private updatePackets(dtSeconds: number): void {
    const server = this.entities.get('server-prod-1');
    const user = this.entities.get('user-group-1');
    if (!server || !user) return;

    const packetsToRemove: string[] = [];

    for (const [id, packet] of this.packets) {
      packet.progress += packet.speed * dtSeconds;

      if (packet.progress >= 1.0) {
        packet.progress = 1.0;
        packetsToRemove.push(id);

        if (packet.type === 'request') {
          // Request has reached the server
          this.handleRequestArrival(packet, server, user);
        } else {
          // Response has returned to the user
          this.handleResponseArrival(packet);
        }
      }
    }

    for (const id of packetsToRemove) {
      this.packets.delete(id);
    }
  }

  private handleRequestArrival(packet: Packet, server: Entity, user: Entity): void {
    // Check if server is overloaded or connection pool exhausted
    const isConnectionExhausted = server.resources.connections.current > server.resources.connections.max;
    const isCpuCrash = server.resources.cpu.utilizationPct > 100;

    const failed = isConnectionExhausted || isCpuCrash;

    // Server spawns response packet back to User
    const respId = `pkt-${this.nextPacketId++}`;
    const responsePacket: Packet = {
      id: respId,
      fromId: server.id,
      toId: user.id,
      type: 'response',
      progress: 0.0,
      speed: failed ? 1.4 : 2.0,
      status: failed ? 'dropped' : 'in_flight',
      sizeKb: failed ? 0.3 : 18.4,
      createdAtTick: packet.createdAtTick,
    };

    this.packets.set(respId, responsePacket);
  }

  private handleResponseArrival(packet: Packet): void {
    const server = this.entities.get('server-prod-1');
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
      this.logEvent('error', `HTTP 502/504: Server dropped request (latency: ${latencyMs}ms)`);
    }

    this.completedRequestsWindow.push({
      tick: currentTick,
      latencyMs,
      success: isSuccess,
    });
  }

  private updateResourcesAndHealth(): void {
    const server = this.entities.get('server-prod-1');
    if (!server) return;

    // Dynamic CPU calculation based on in-flight and active requests
    const activeReqs = server.resources.connections.current;
    const maxCapacity = (server.configuration.maxRps as number) || 45;
    
    // CPU load base 5% + proportional to active requests
    const baseCpu = 5.0;
    const dynamicCpu = (activeReqs / maxCapacity) * 90.0;
    const targetCpuPct = Math.min(115, Math.round(baseCpu + dynamicCpu));

    // Smooth CPU transition
    server.resources.cpu.utilizationPct += (targetCpuPct - server.resources.cpu.utilizationPct) * 0.2;
    server.resources.cpu.usedCores = Number(((server.resources.cpu.utilizationPct / 100) * server.resources.cpu.capacityCores).toFixed(2));

    // Memory usage follows connection count
    const baseMemoryMb = 280;
    const memPerConnMb = 14;
    server.resources.memory.usedMb = Math.round(baseMemoryMb + activeReqs * memPerConnMb);
    server.resources.memory.utilizationPct = Number(((server.resources.memory.usedMb / server.resources.memory.capacityMb) * 100).toFixed(1));

    // Determine Health Status per Section 12
    const cpu = server.resources.cpu.utilizationPct;
    let newStatus: HealthStatus = 'HEALTHY';

    if (cpu >= 100 || activeReqs > server.resources.connections.max) {
      newStatus = 'FAILING';
    } else if (cpu >= 85) {
      newStatus = 'OVERLOADED';
    } else if (cpu >= 70) {
      newStatus = 'DEGRADED';
    } else {
      newStatus = 'HEALTHY';
    }

    if (server.status !== newStatus) {
      const oldStatus = server.status;
      server.status = newStatus;

      const level = newStatus === 'HEALTHY' ? 'success' : (newStatus === 'DEGRADED' ? 'warn' : 'error');
      this.logEvent(level, `Server status transitioned: ${oldStatus} → ${newStatus} (CPU: ${Math.round(cpu)}%)`);
    }

    this.metrics.clusterHealth = server.status;
  }

  private updateMetrics(currentTick: number): void {
    // Keep a rolling 3-second window (60 ticks at 20Hz)
    const windowTicks = 60;
    const recent = this.completedRequestsWindow.filter(r => currentTick - r.tick <= windowTicks);

    if (recent.length > 0) {
      const windowSeconds = windowTicks * this.clock.tickDurationSeconds;
      this.metrics.currentRps = Number((recent.length / windowSeconds).toFixed(1));

      const totalLat = recent.reduce((sum, r) => sum + r.latencyMs, 0);
      this.metrics.averageLatencyMs = Math.round(totalLat / recent.length);
    } else {
      this.metrics.currentRps = 0;
    }

    // Update connection traffic
    const conn = this.connections.get('conn-user-to-server');
    if (conn) {
      conn.currentTrafficMbps = Number((this.metrics.currentRps * 0.16).toFixed(2));
    }
  }

  private pruneHistory(currentTick: number): void {
    const maxWindowTicks = 120; // 6 seconds
    this.completedRequestsWindow = this.completedRequestsWindow.filter(r => currentTick - r.tick <= maxWindowTicks);

    // Limit event log size
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
