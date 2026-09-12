# StackWorld Documentation

Welcome to the **StackWorld** documentation directory.

StackWorld is an interactive visual simulation game designed to teach full-stack engineering, web infrastructure, DevOps, cloud architecture, and system reliability through **direct consequences**.

---

## 📚 Documentation Index

| Document | Purpose |
| :--- | :--- |
| **[ARCHITECTURE.md](file:///Users/rabbi/Desktop/Projects/StackWorld/docs/ARCHITECTURE.md)** | Technical design, tick model, rendering pipeline, and state flow. |
| **[CONTRIBUTING.md](file:///Users/rabbi/Desktop/Projects/StackWorld/docs/CONTRIBUTING.md)** | Open source contribution guide, PR standards, and development workflow. |
| **[CHANGELOG.md](file:///Users/rabbi/Desktop/Projects/StackWorld/docs/CHANGELOG.md)** | Chronological log of releases, major milestones, and bug fixes. |
| **[SCENARIO_AUTHORING.md](file:///Users/rabbi/Desktop/Projects/StackWorld/docs/SCENARIO_AUTHORING.md)** | How to write new declarative infrastructure scenarios and challenges. |
| **[spec.md](file:///Users/rabbi/Desktop/Projects/StackWorld/spec.md)** | The comprehensive master specification and 20-phase roadmap. |

---

## 🏛️ Core Architectural Principles

1. **Consequences Over Documentation**: Learners diagnose failures visually through animated packet flows, saturated connection queues, and degraded health states.
2. **Decoupled Simulation Engine**: The simulation engine has **zero dependencies on React or UI libraries**. It runs deterministically on fixed 20 Hz ticks and emits snapshots.
3. **Pure Canvas 2D Viewport**: Ultra-crisp High-DPI canvas rendering at 60–120 FPS with smooth cubic bezier wires and particle interpolation.
4. **Vertical Slice Development**: Every new infrastructure component introduces its engine logic, visual node, scenario, failure mode, solutions, and unit tests simultaneously.
