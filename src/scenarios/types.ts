import { HealthStatus } from '../shared/types';

export interface ArchitecturalSolution {
  id: string;
  name: string;
  tagline: string;
  category: 'vertical' | 'cdn' | 'horizontal' | 'cache';
  costMonthlyDelta: number;
  complexity: 'Low' | 'Medium' | 'High';
  reliability: 'Moderate' | 'High' | 'Very High';
  description: string;
  pros: string[];
  cons: string[];
  appliedExplanation: string;
}

export interface ScenarioObjective {
  id: string;
  title: string;
  description: string;
  isCompleted: boolean;
}

export type ScenarioStageId = 
  | 'stage_baseline' 
  | 'stage_surge' 
  | 'stage_degraded' 
  | 'stage_solution_applied' 
  | 'stage_victory';

export interface ScenarioStage {
  id: ScenarioStageId;
  title: string;
  targetRps: number;
  instructions: string;
}

export interface ScenarioDefinition {
  id: string;
  title: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  estimatedMinutes: number;
  prerequisites: string[];
  learningObjectives: string[];
  startingBudgetMonthly: number;
  stages: ScenarioStage[];
  availableSolutions: ArchitecturalSolution[];
  successConditions: {
    minSustainedSeconds: number;
    maxErrorRate: number;
    requiredHealth: HealthStatus;
  };
}

export interface ScenarioState {
  currentStageId: ScenarioStageId;
  selectedSolutionId: string | null;
  sustainedHealthySeconds: number;
  isSolutionModalOpen: boolean;
  isVictoryModalOpen: boolean;
  score?: {
    grade: 'S' | 'A' | 'B' | 'C';
    reliabilityScore: number;
    costEfficiencyScore: number;
    complexityScore: number;
    summary: string;
  };
}
