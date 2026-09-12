# Scenario Authoring Guide

StackWorld is designed to be **curriculum-driven and data-driven**. New infrastructure challenges and scenarios can be created without modifying the core simulation engine.

---

## 📋 Scenario Schema

A scenario definition specifies the starting topology, learning objectives, events, failure modes, and candidate solutions:

```typescript
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
```

---

## 🎯 Authoring Workflow

1. **Define the Educational Purpose**:
   - What core infrastructure concept is being taught? (e.g. *Why does a cache prevent database connection exhaustion?*)
2. **Establish the Baseline**:
   - Provide a working architecture under normal load.
3. **Trigger the Degradation Event**:
   - Traffic surge, network partition, hardware failure, or configuration error.
4. **Offer Plausible Solutions**:
   - Present at least 2–3 viable engineering fixes with realistic trade-offs in **Cost**, **Complexity**, and **Reliability**.
5. **Set Clear Evaluation Criteria**:
   - Define minimum sustained uptime, error rate threshold, and budget cap.
