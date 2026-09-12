# Changelog

All notable changes to **StackWorld** are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
