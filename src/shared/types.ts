export type HealthStatus = 
  | 'HEALTHY' 
  | 'DEGRADED' 
  | 'OVERLOADED' 
  | 'FAILING' 
  | 'DOWN' 
  | 'RECOVERING';

export type EntityType = 
  | 'user' 
  | 'network' 
  | 'static_host' 
  | 'dns' 
  | 'cdn'
  | 'api'
  | 'database' 
  | 'pgbouncer'
  | 'redis'
  | 'server' 
  | 'load_balancer';

export interface Vector2D {
  x: number;
  y: number;
}

export interface ResourceState {
  cpu: {
    capacityCores: number;
    usedCores: number;
    utilizationPct: number; // 0 to 100+
  };
  memory: {
    capacityMb: number;
    usedMb: number;
    utilizationPct: number;
  };
  disk?: {
    capacityGb: number;
    usedGb: number;
  };
  connections: {
    current: number;
    max: number;
  };
}

export interface Entity {
  id: string;
  type: EntityType;
  name: string;
  position: Vector2D;
  status: HealthStatus;
  resources: ResourceState;
  configuration: {
    maxRps?: number;
    baseLatencyMs?: number;
    ipAddress?: string;
    domain?: string;
    port?: number;
    version?: string;
    cacheHitRatio?: number;
    activeQueries?: number;
    hasIndex?: boolean;
    hasPooler?: boolean;
    [key: string]: unknown;
  };
  costMonthly: number;
}

export interface Connection {
  id: string;
  fromId: string;
  toId: string;
  bandwidthMbps: number;
  latencyMs: number;
  currentTrafficMbps: number;
}

export interface Packet {
  id: string;
  fromId: string;
  toId: string;
  type: 'request' | 'response' | 'sql_query' | 'sql_result' | 'cache_query' | 'cache_hit';
  path: string[];            // Multi-hop path: e.g. ['user', 'dns', 'host']
  currentHopIndex: number;   // Current index in path
  progress: number;          // 0.0 to 1.0 along the current hop
  speed: number;             // progress advance per second
  status: 'in_flight' | 'delivered' | 'dropped';
  sizeKb: number;
  createdAtTick: number;
  isCached?: boolean;        // True if served from CDN edge cache
  sqlQuery?: string;         // SQL statement for database queries
}

export interface SimulationMetrics {
  requestsTotal: number;
  requestsSuccessful: number;
  requestsFailed: number;
  currentRps: number;
  averageLatencyMs: number;
  clusterHealth: HealthStatus;
  monthlyCost: number;
}

export interface SimulationEvent {
  id: string;
  tick: number;
  simTimeFormatted: string;
  level: 'info' | 'warn' | 'error' | 'success';
  message: string;
  entityId?: string;
}

import { ScenarioState } from '../scenarios/types';

export interface SimulationSnapshot {
  tick: number;
  timeSeconds: number;
  speedMultiplier: number;
  isPaused: boolean;
  entities: Entity[];
  connections: Connection[];
  packets: Packet[];
  metrics: SimulationMetrics;
  events: SimulationEvent[];
  scenarioState: ScenarioState;
}

export interface CameraState {
  panX: number;
  panY: number;
  zoom: number;
}
