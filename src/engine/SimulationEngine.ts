/**
 * SimulationEngine.ts
 * 
 * The core deterministic simulation engine for StackWorld.
 * STRICT RULE: Zero React or UI dependencies.
 * 
 * Supports:
 * - Deterministic fixed 20 Hz tick loop
 * - Multi-hop routing: User -> DNS -> [CDN / LB] -> Static Host
 * - Scenario progression (Baseline -> Surge -> Degraded -> Solution -> Victory)
 * - Dynamic live topology mutations (Vertical scaling, Edge CDN insertion, Horizontal LB)
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
import { staticSiteScenario } from '../scenarios/staticSiteScenario';
import { ScenarioState } from '../scenarios/types';

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
  private completedRequestsWindow: { tick: number; latencyMs: number; success: boolean }[] = [];

  // Snapshot listeners
  private snapshotListeners: Set<(snapshot: SimulationSnapshot) => void> = new Set();

  constructor(config: SimulationEngineConfig = {}) {
    this.clock = new SimulationClock(20);
    this.targetRps = config.initialRps ?? 6;

    this.initializeDefaultWorld();

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
   * Applies an architectural solution chosen by the learner.
   */
  public applySolution(solutionId: string): void {
    const solution = staticSiteScenario.availableSolutions.find((s) => s.id === solutionId);
    if (!solution) return;

    this.scenarioState.selectedSolutionId = solutionId;
    this.scenarioState.isSolutionModalOpen = false;
    this.scenarioState.currentStageId = 'stage_solution_applied';
    this.scenarioState.sustainedHealthySeconds = 0;

    if (solutionId === 'sol_vertical_scale') {
      // Scale server vertically
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
      // Deploy Edge CDN between DNS and Host
      const cdn: Entity = {
        id: 'cdn-edge-1',
        type: 'cdn',
        name: 'Cloudflare Edge CDN',
        position: { x: 90, y: 0 },
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

      this.entities.set(cdn.id, cdn);

      // Reconnect: DNS -> CDN, CDN -> Server
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
      this.logEvent('success', 'Architecture updated: Edge CDN deployed! 80% of static traffic will be cached.');
    } else if (solutionId === 'sol_load_balancer') {
      // Deploy Load Balancer and second server
      const lb: Entity = {
        id: 'lb-1',
        type: 'load_balancer',
        name: 'Nginx Load Balancer',
        position: { x: 70, y: 0 },
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
        position: { x: 280, y: 110 },
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

      // Reposition Server 1
      const server1 = this.entities.get('server-prod-1');
      if (server1) {
        server1.name = 'Web Host 01';
        server1.position = { x: 280, y: -110 };
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

  private initializeDefaultWorld(): void {
    const userGroup: Entity = {
      id: 'user-group-1',
      type: 'user',
      name: 'Internet Visitors',
      position: { x: -320, y: 0 },
      status: 'HEALTHY',
      resources: {
        cpu: { capacityCores: 1, usedCores: 0.1, utilizationPct: 10 },
        memory: { capacityMb: 512, usedMb: 48, utilizationPct: 9.3 },
        connections: { current: 0, max: 10000 },
      },
      configuration: {
        location: 'Global (North America / Europe / Asia)',
        browserClients: 240,
        protocol: 'HTTP/2',
      },
      costMonthly: 0,
    };

    const dnsServer: Entity = {
      id: 'dns-1',
      type: 'dns',
      name: 'Authoritative DNS',
      position: { x: -60, y: 0 },
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
      position: { x: 240, y: 0 },
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

    // Initial Connections: User -> DNS -> Server
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

    this.logEvent('info', 'Scenario loaded: User → Authoritative DNS → Web Host (Nginx)');
  }

  private processScenarioProgress(dtSeconds: number): void {
    const simTime = this.clock.getSimTimeSeconds();

    // Stage 1 -> Stage 2: Automatic Traffic Surge at 14s
    if (this.scenarioState.currentStageId === 'stage_baseline' && simTime >= 12) {
      this.scenarioState.currentStageId = 'stage_surge';
      this.targetRps = 38;
      this.logEvent('warn', '🚨 Product Hunt feature launched! Traffic surging to 38 req/s.');
    }

    // Stage 2 -> Stage 3: Server Degradation detection
    if (this.scenarioState.currentStageId === 'stage_surge') {
      const server = this.entities.get('server-prod-1');
      if (server && (server.status === 'OVERLOADED' || server.status === 'FAILING' || server.resources.cpu.utilizationPct > 80)) {
        this.scenarioState.currentStageId = 'stage_degraded';
        this.scenarioState.isSolutionModalOpen = true;
        this.logEvent('error', '⚠️ Server overloaded! Capacity exceeded. Please choose an architectural remedy.');
      }
    }

    // Stage 4 -> Stage 5: Solution verification (sustain 12s healthy)
    if (this.scenarioState.currentStageId === 'stage_solution_applied') {
      if (this.metrics.clusterHealth === 'HEALTHY' || this.metrics.clusterHealth === 'DEGRADED') {
        this.scenarioState.sustainedHealthySeconds += dtSeconds;
        if (this.scenarioState.sustainedHealthySeconds >= staticSiteScenario.successConditions.minSustainedSeconds) {
          this.scenarioState.currentStageId = 'stage_victory';
          this.scenarioState.isVictoryModalOpen = true;
          this.calculateVictoryScore();
          this.logEvent('success', '🏆 SCENARIO COMPLETE! Your architecture passed all production requirements.');
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
    const dns = this.entities.get('dns-1');
    if (!user || !dns) return;

    while (this.pendingRequestAccumulator >= 1.0) {
      this.pendingRequestAccumulator -= 1.0;
      this.metrics.requestsTotal++;
      this.requestCounter++;

      // Construct multi-hop request path
      let requestPath = [user.id, dns.id];

      const hasCdn = this.entities.has('cdn-edge-1');
      const hasLb = this.entities.has('lb-1');

      if (hasCdn) {
        requestPath.push('cdn-edge-1');
      } else if (hasLb) {
        requestPath.push('lb-1');
        // Round robin between server 1 and 2
        const targetServer = this.requestCounter % 2 === 0 ? 'server-prod-1' : 'server-prod-2';
        requestPath.push(targetServer);
      } else {
        requestPath.push('server-prod-1');
      }

      const packetId = `pkt-${this.nextPacketId++}`;
      const packet: Packet = {
        id: packetId,
        fromId: requestPath[0],
        toId: requestPath[1],
        type: 'request',
        path: requestPath,
        currentHopIndex: 0,
        progress: 0.0,
        speed: 2.8,
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

          // Check CDN Edge Cache Hit
          if (currentTargetId === 'cdn-edge-1') {
            const isCacheHit = Math.random() < 0.8;
            if (isCacheHit) {
              // Cache HIT! Packet bounces back directly from CDN to User
              packet.type = 'response';
              packet.isCached = true;
              packet.fromId = 'cdn-edge-1';
              packet.toId = 'user-group-1';
              packet.progress = 0.0;
              packet.speed = 3.2; // Blazing fast cached return
              continue;
            } else {
              // Cache MISS! Advance to origin server
              packet.currentHopIndex = nextHopIdx;
              packet.fromId = 'cdn-edge-1';
              packet.toId = 'server-prod-1';
              packet.progress = 0.0;
              continue;
            }
          }

          // Check if packet reached intermediate node (e.g. DNS or LB)
          if (nextHopIdx < packet.path.length - 1) {
            packet.currentHopIndex = nextHopIdx;
            packet.fromId = packet.path[nextHopIdx];
            packet.toId = packet.path[nextHopIdx + 1];
            packet.progress = 0.0;
            continue;
          }

          // Packet reached final origin host
          packetsToRemove.push(id);
          this.handleRequestArrival(packet, currentTargetId);
        } else {
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

  private handleRequestArrival(packet: Packet, serverId: string): void {
    const server = this.entities.get(serverId) || this.entities.get('server-prod-1');
    const user = this.entities.get('user-group-1');
    if (!server || !user) return;

    server.resources.connections.current++;

    const isConnectionExhausted = server.resources.connections.current > server.resources.connections.max;
    const isCpuCrash = server.resources.cpu.utilizationPct > 100;
    const failed = isConnectionExhausted || isCpuCrash;

    const respId = `pkt-${this.nextPacketId++}`;
    const responsePacket: Packet = {
      id: respId,
      fromId: server.id,
      toId: user.id,
      type: 'response',
      path: [server.id, user.id],
      currentHopIndex: 0,
      progress: 0.0,
      speed: failed ? 1.6 : 2.5,
      status: failed ? 'dropped' : 'in_flight',
      sizeKb: failed ? 0.3 : 18.4,
      createdAtTick: packet.createdAtTick,
    };

    this.packets.set(respId, responsePacket);
  }

  private handleResponseArrival(packet: Packet): void {
    const origin = this.entities.get(packet.fromId);
    if (origin && origin.resources.connections.current > 0) {
      origin.resources.connections.current--;
    }

    const currentTick = this.clock.getTick();
    const flightTicks = currentTick - packet.createdAtTick;
    const latencyMs = Math.round(flightTicks * this.clock.tickDurationMs);

    const isSuccess = packet.status !== 'dropped';
    if (isSuccess) {
      this.metrics.requestsSuccessful++;
    } else {
      this.metrics.requestsFailed++;
      this.logEvent('error', `HTTP 502 Bad Gateway: Origin server capacity dropped connection (${latencyMs}ms)`);
    }

    this.completedRequestsWindow.push({
      tick: currentTick,
      latencyMs,
      success: isSuccess,
    });
  }

  private updateResourcesAndHealth(): void {
    const servers = Array.from(this.entities.values()).filter((e) => e.type === 'static_host');
    let worstHealth: HealthStatus = 'HEALTHY';

    for (const server of servers) {
      const activeReqs = server.resources.connections.current;
      const maxCapacity = (server.configuration.maxRps as number) || 45;

      const baseCpu = 4.0;
      const dynamicCpu = (activeReqs / maxCapacity) * 88.0;
      const targetCpuPct = Math.min(115, Math.round(baseCpu + dynamicCpu));

      server.resources.cpu.utilizationPct += (targetCpuPct - server.resources.cpu.utilizationPct) * 0.22;
      server.resources.cpu.usedCores = Number(((server.resources.cpu.utilizationPct / 100) * server.resources.cpu.capacityCores).toFixed(2));

      server.resources.memory.usedMb = Math.round(280 + activeReqs * 14);
      server.resources.memory.utilizationPct = Number(((server.resources.memory.usedMb / server.resources.memory.capacityMb) * 100).toFixed(1));

      const cpu = server.resources.cpu.utilizationPct;
      let newStatus: HealthStatus = 'HEALTHY';

      if (cpu >= 100 || activeReqs > server.resources.connections.max) {
        newStatus = 'FAILING';
      } else if (cpu >= 80) {
        newStatus = 'OVERLOADED';
      } else if (cpu >= 65) {
        newStatus = 'DEGRADED';
      }

      if (server.status !== newStatus) {
        server.status = newStatus;
      }

      if (newStatus === 'FAILING') worstHealth = 'FAILING';
      else if (newStatus === 'OVERLOADED' && worstHealth !== 'FAILING') worstHealth = 'OVERLOADED';
      else if (newStatus === 'DEGRADED' && worstHealth === 'HEALTHY') worstHealth = 'DEGRADED';
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
