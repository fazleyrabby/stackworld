# Changelog

All notable changes to **StackWorld** are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
