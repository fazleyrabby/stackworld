/**
 * Central scenario registry.
 *
 * Single source of truth for scenario ids and definitions. The engine, TopBar
 * scenario selector, and tests all resolve scenarios from this map so adding
 * a new scenario never requires touching union types across the codebase.
 */
import { ScenarioDefinition } from './types';
import { staticSiteScenario } from './staticSiteScenario';
import { backendDbScenario } from './backendDbScenario';
import { redisCacheScenario } from './redisCacheScenario';
import { jobQueueScenario } from './jobQueueScenario';

export const SCENARIOS: Record<string, ScenarioDefinition> = {
  [staticSiteScenario.id]: staticSiteScenario,
  [backendDbScenario.id]: backendDbScenario,
  [redisCacheScenario.id]: redisCacheScenario,
  [jobQueueScenario.id]: jobQueueScenario,
};

/** Ordered list used by the scenario selector UI (learning ladder: basic → advanced). */
export const SCENARIO_LIST: Array<{ id: string; label: string; scenario: ScenarioDefinition }> = [
  { id: staticSiteScenario.id, label: 'Level 1: Keep The Website Online', scenario: staticSiteScenario },
  { id: backendDbScenario.id, label: 'Level 2: The Slow Database Incident', scenario: backendDbScenario },
  { id: redisCacheScenario.id, label: 'Level 3: The Cache Stampede Crisis', scenario: redisCacheScenario },
  { id: jobQueueScenario.id, label: 'Level 4: The Synchronous Job Crisis', scenario: jobQueueScenario },
];

export function getScenario(scenarioId: string): ScenarioDefinition | undefined {
  return SCENARIOS[scenarioId];
}
