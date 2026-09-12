# ⚡ StackWorld

> **An interactive visual infrastructure simulator and system architecture game designed to teach full-stack engineering, cloud systems, and DevOps through direct consequences.**

[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19.0-61dafb.svg)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-6.4-646CFF.svg)](https://vitejs.dev/)
[![Vitest](https://img.shields.io/badge/Vitest-3.2-yellow.svg)](https://vitest.dev/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

---

## 🌟 Overview

**StackWorld** transforms abstract software architecture and cloud infrastructure concepts into a tactile, visual simulation. Rather than reading about connection pool exhaustion, unindexed full table scans, cache stampedes, or load balancing algorithms in static articles, learners build, stress-test, break, and diagnose real systems in real time.

```
                         INTERNET
                             │
                             ▼
                    ┌────────────────┐
                    │      DNS       │
                    └───────┬────────┘
                            │
                    ┌───────▼────────┐
                    │      CDN       │ (80% Edge Cache Hit)
                    └───────┬────────┘
                            │
                    ┌───────▼────────┐
                    │ LOAD BALANCER  │ (Round-Robin)
                    └───────┬────────┘
                       ┌────┴────┐
                       ▼         ▼
                    APP-01    APP-02
                       │         │
                       └────┬────┘
                            ▼
                    ┌────────────────┐
                    │   PGBOUNCER    │ (Connection Pooler)
                    └───────┬────────┘
                            │
                            ▼
                    ┌────────────────┐
                    │ POSTGRESQL 16  │ (B-Tree Index vs Seq Scan)
                    └────────────────┘
```

---

## ✨ Features

### 🎮 High-Performance 2D Canvas World
- **Smooth Visuals**: 60–120 FPS high-DPI Canvas 2D renderer with cubic bezier cables and animated in-flight request/response packets.
- **Interactive Topologies**: Pan the camera, mouse-wheel zoom ($35\%\text{–}250\%$), and touch/drag any infrastructure node with real-time cable re-routing in a single fluid gesture.
- **Multi-Hop Traversal**: Packets travel along established network cables in both directions (forward requests and reverse responses) with physical latency and packet drops.

### ⚙️ Deterministic Simulation Engine
- **Decoupled & Headless**: 100% zero React or DOM dependencies. Runs headless on a fixed 20 Hz accumulator clock (`dt = 50ms`).
- **Full Physics Telemetry**: Real-time tracking of CPU utilization, RAM usage, active socket connections, query execution times, and multi-state health (`HEALTHY`, `DEGRADED`, `OVERLOADED`, `FAILING`, `DOWN`).
- **Playback Controls**: Pause, step single ticks, adjust simulation speeds (`0.5×`, `1×`, `2×`, `5×`), and inject instant traffic spikes.

### 📚 Interactive Incident Scenarios

#### Phase 1: Keep The Website Online (`scenario-1-static-site`)
- **Challenge**: Origin Nginx web server degrades and drops sockets under visitor surge.
- **Architectural Remedies**:
  - 🚀 **Vertical Scaling**: Scale VM to 4 vCPUs / 4GB RAM (+$15/mo).
  - ⚡ **Edge CDN**: Deploy Cloudflare CDN caching 80% of requests with instant 8ms responses (+$5/mo, S-Tier).
  - ⚖️ **Load Balancer**: Deploy Nginx Load Balancer with redundant second host (+$25/mo, A-Tier).

#### Phase 2: The Slow Database Incident (`scenario-2-backend-db`)
- **Challenge**: Multi-tier app (`User → Frontend → Node/Go API → PostgreSQL 16`) exhausts connection pool (`20/20` sockets) caused by slow sequential table scans on a 500,000-row `orders` table.
- **Architectural Remedies**:
  - ⚡ **B-Tree Database Index**: `CREATE INDEX idx_orders_status ON orders(status, created_at)`. Switches query planner from $O(N)$ Seq Scan (850ms) to $O(\log N)$ Index Scan (3ms) at **$0/mo** (S-Tier).
  - 🛡️ **PgBouncer Connection Pooler**: Multiplexes incoming API client sockets over 8 persistent database connections (+$10/mo, B-Tier).
  - 📦 **Scale Up DB Tier**: Upsizes database hardware to 4 vCPUs / 8GB RAM (+$35/mo, C-Tier Anti-Pattern).

### 🎨 Pure Vanilla CSS Craft Floor
- Zero Tailwind / PostCSS runtime overhead.
- Glassmorphic HUD with curated dark theme palette (`#080c14`, `#0f172a`, `#38bdf8`, `#10b981`, `#f59e0b`, `#ef4444`).
- Monospace tabular number slots (`font-variant-numeric: tabular-nums`) preventing layout thrashing and jitter during high-frequency traffic updates.
- GPU-accelerated resource meters (`transform: scaleX(...)`) with tactile button physical elevation.

---

## 🚀 Quickstart

### Prerequisites
- **Node.js**: v18.0 or newer
- **pnpm** (recommended), npm, or yarn

### Installation & Run

```bash
# 1. Clone the repository
git clone https://github.com/fazleyrabby/stackworld.git
cd stackworld

# 2. Install dependencies
pnpm install

# 3. Start local development server
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Test & Build

```bash
# Run headless unit tests (Vitest)
pnpm test

# Build optimized production bundle
pnpm build
```

---

## 📁 Codebase Architecture

```
stackworld/
├── src/
│   ├── engine/                # Headless simulation engine (Zero React/UI imports)
│   │   ├── Clock.ts           # 20 Hz fixed-timestep deterministic clock
│   │   └── SimulationEngine.ts# State updates, metrics, packet lifecycle & routing
│   ├── world/                 # High-DPI Canvas 2D visualization layer
│   │   ├── Camera.ts          # World-to-Screen / Screen-to-World transform matrix
│   │   ├── CanvasRenderer.ts  # Node cards, bezier cables, packet particles, mini-bars
│   │   ├── InteractionManager.ts # Pointer capture, camera panning, 1-touch node drag
│   │   └── WorldViewport.tsx  # React canvas wrapper & render loop
│   ├── scenarios/             # Declarative curriculum scenarios
│   │   ├── staticSiteScenario.ts # Scenario 1: Keep Website Online
│   │   └── backendDbScenario.ts  # Scenario 2: The Slow Database Incident
│   ├── ui/                    # Dark glassmorphic React HUD
│   │   ├── TopBar.tsx         # Telemetry, health pill, budget, scenario selector
│   │   ├── Inspector.tsx      # Slide-over inspector, live gauges, DB query profiler
│   │   ├── ControlBar.tsx     # Speed multipliers, pause/play, step, spike injector
│   │   ├── ObjectiveTracker.tsx # Quest goal, instructions, diagnosis button
│   │   ├── SolutionModal.tsx  # Architectural remedies modal
│   │   └── VictoryModal.tsx   # Scoring evaluation (S / A / B / C grades)
│   ├── state/                 # Zustand UI state store
│   ├── shared/                # TypeScript domain models and interfaces
│   └── index.css              # Pure Vanilla CSS design system
├── tests/                     # Vitest test suite (Clock, Engine, Scenarios)
└── docs/                      # Technical documentation
    ├── ARCHITECTURE.md        # Technical deep-dive & rendering pipeline
    ├── SCENARIO_AUTHORING.md  # How to create new infrastructure challenges
    ├── CONTRIBUTING.md        # Open-source contribution guidelines
    └── CHANGELOG.md           # Version release notes
```

---

## 📖 Documentation

For in-depth guides and developer documentation, visit the [`docs/`](file:///Users/rabbi/Desktop/Projects/StackWorld/docs) directory:

- 🏛️ **[Architecture Guide](file:///Users/rabbi/Desktop/Projects/StackWorld/docs/ARCHITECTURE.md)**: Deep dive into the tick loop, multi-hop packet routing, and state immutability.
- ✍️ **[Scenario Authoring](file:///Users/rabbi/Desktop/Projects/StackWorld/docs/SCENARIO_AUTHORING.md)**: Guide on authoring custom failure modes and trade-off solutions.
- 🤝 **[Contributing Guide](file:///Users/rabbi/Desktop/Projects/StackWorld/docs/CONTRIBUTING.md)**: Contribution standards, code style, and PR checklist.
- 📜 **[Changelog](file:///Users/rabbi/Desktop/Projects/StackWorld/docs/CHANGELOG.md)**: Release history and version notes.
- 🗺️ **[Master Specification](file:///Users/rabbi/Desktop/Projects/StackWorld/spec.md)**: The full product vision and 20-phase roadmap.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
