# Changelog

All notable changes to **StackWorld** are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [0.4.0] - 2026-09-25

### Added
- **Phase 12: Queues & Asynchronous Processing**:
  - New Scenario 4: *"The Synchronous Job Crisis"* (`scenario-4-job-queues`), modeling a Billing API that renders invoice PDFs inline on the request path (`User → Checkout → Billing API → PostgreSQL`).
  - New node types: **BullMQ Job Queue** (`queue`) and **Invoice PDF Worker** (`worker`), with live backlog/concurrency meters on the canvas and dedicated Inspector profiles.
  - `202 Accepted` request short-circuit plus orange background-job particles flowing queue → worker.
  - Three architectural remedies with distinct grades: **Job Queue + Workers** (S), **Vertical API Upgrade** (B), and the educational **Queue-Only Trap** (C) — a queue with zero consumers whose hidden backlog grows forever.
  - Central scenario registry (`src/scenarios/index.ts`); selector, engine, and HUD all resolve from it — adding a lesson no longer requires touching union types across the codebase.
- **UI Clarity Overhaul**:
  - New `CoachOverlay` onboarding guide ("How to Read This World"): packet color legend, health state meanings, the incident loop, and playback controls. Auto-shows on first visit; re-openable via the TopBar **Guide** button.
  - Objective, incident diagnosis, solution cards, and budget ceiling are now driven by the **active scenario** carried in `SimulationSnapshot`.
  - Friendlier HUD copy: "Lesson", "Requests / sec", "Served", "Monthly spend / budget", "What you gain / What it costs you".
  - Inspector footer coordinates readout replaced with practical canvas control hints; user node now shows its real simulated client count.

### Fixed
- **Connection accounting bug (recovery was impossible)**: `handleResponseArrival` decremented the penultimate hop instead of the server that served the request, so `connections.current` only ever grew and nodes could never heal after a solution was deployed.
- **Hardcoded Scenario 1 content leaked into every lesson**: the ObjectiveTracker showed Lesson 1 stage text and the Incident Diagnosis modal offered Lesson 1's CDN/LB solutions while playing Lessons 2–3.
- **Flaky test eliminated**: the engine now runs on a seeded deterministic PRNG (mulberry32) instead of `Math.random()` inside packet routing, honoring the "deterministic simulation engine" principle.

---

## [0.3.0] - 2026-09-12

### Added
- **Phase 4 & Phase 5: Backend API & PostgreSQL Database Simulation**:
  - New Scenario 2: *"The Slow Database Incident"* (`scenario-2-backend-db`), modeling multi-tier web traffic (`User → Frontend → Backend API → PostgreSQL 16`).
  - Implemented SQL query packet dynamics with amber visual particles (`#f59e0b`) and query latency simulation.
  - Modeled database connection pool exhaustion (20/20 max connections) triggered by unindexed sequential table scans over 500,000 rows.
  - Three architectural remedies:
    1. **B-Tree Database Index**: Eliminates sequential table scans, cutting query execution latency from 850ms to 3ms at $0/mo cost.
    2. **PgBouncer Connection Pooler**: Multiplexes hundreds of API client sockets over 8 persistent backend database sockets.
    3. **Vertical Database Tier Upgrade**: Upsizes instance to 4 vCPUs / 8GB RAM.
  - Interactive **Scenario Selector** in `TopBar.tsx` allowing instantaneous switching between scenarios.
  - Enhanced **Inspector** displaying live Query Execution Engine status, table scan modes, query latency, and connection multiplexing metrics.
  - Added 7 unit tests in `tests/BackendDb.test.ts` (bringing test suite to 21 passing tests).

---

## [0.2.0] - 2026-09-12

### Added
- Pure Vanilla CSS design system in `src/index.css` with dark space theme and glassmorphic HUD.
- Tabular numeric slots (`font-variant-numeric: tabular-nums`) with fixed width constraints to eliminate TopBar HUD telemetry jitter.
- Scenario definitions for Phase 2 & 3: *"Keep The Website Online"*, including 3 candidate architectural remedies (Vertical Scale, Edge CDN, Load Balancer).
- Comprehensive documentation directory (`docs/README.md`, `docs/ARCHITECTURE.md`, `docs/CONTRIBUTING.md`, `docs/SCENARIO_AUTHORING.md`).

### Fixed
- Fixed unstyled layout bug where UI controls were rendering without CSS styling.
- Resolved text shifting in TopBar telemetry counters during high-frequency traffic updates.

---

## [0.1.0] - 2026-09-12

### Added
- **Phase 0 (Project Foundation)**:
  - React 19 + TypeScript + Vite project scaffolding.
  - Vitest test runner setup for headless engine tests.
  - Git repository initialization and connection to GitHub.
- **Phase 1 (Visual World & Simulation Engine)**:
  - Deterministic 20 Hz fixed-timestep accumulator clock with speed toggles (`0.5×`, `1×`, `2×`, `5×`) and single-tick stepping.
  - Headless `SimulationEngine` tracking CPU, RAM, active sockets, and multi-state health.
  - High-DPI Canvas 2D viewport with cubic bezier connection cables and animated packet particles.
  - Interactive world: canvas pan, mouse wheel zoom, click-to-select, and node dragging with live connection re-routing.
  - Game HUD: TopBar telemetry, Inspector slide-over with real-time gauges, ControlBar playback, and EventLog drawer.
  - Unit tests for clock determinism and request lifecycle.
