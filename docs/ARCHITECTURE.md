# StackWorld Technical Architecture

## 1. High-Level Architecture

StackWorld strictly separates the **Deterministic Simulation Engine** from the **React UI and Viewport**.

```
┌─────────────────────────────────────────────────────────────┐
│                       React 19 Shell                        │
│   ┌───────────────┐ ┌───────────────┐ ┌─────────────────┐   │
│   │    TopBar     │ │   Inspector   │ │   ControlBar    │   │
│   └───────┬───────┘ └───────┬───────┘ └────────┬────────┘   │
└───────────┼─────────────────┼──────────────────┼────────────┘
            │                 │                  │
            ▼                 ▼                  ▼
┌─────────────────────────────────────────────────────────────┐
│                    Zustand UI State Store                   │
│   (Selected entity ID, Camera pan/zoom, Active tab)         │
└─────────────────────────────┬───────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                  HTML5 Canvas 2D Viewport                   │
│   - Retina/DPI awareness                                    │
│   - Camera 2D projection (World ↔ Screen matrix)            │
│   - Smooth cubic bezier wire rendering with flow pulses     │
│   - Particle interpolation at 60–120 FPS                    │
└─────────────────────────────▲───────────────────────────────┘
                              │
                  State Snapshot Subscription (20 Hz)
                              │
┌─────────────────────────────────────────────────────────────┐
│                 Core Simulation Engine                      │
│   STRICT RULE: Zero React or UI dependencies                │
│                                                             │
│   ├── Clock: Fixed 20 Hz (50ms) accumulator                 │
│   ├── TrafficEngine: Discrete & burst request generation    │
│   ├── NetworkEngine: Multi-hop routing, latency, bandwidth  │
│   ├── ResourceEngine: Dynamic CPU, memory & connection pool │
│   └── EventLogger: Timestamped infrastructure event log     │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Timing & Tick Model

### Deterministic Clock (`SimulationClock.ts`)
* Fixed timestep: **20 Hz (50ms per tick)**.
* Independent of display refresh rate: Monitors running at 60Hz, 120Hz, or 144Hz experience identical simulation physics and resource accumulation.
* Variable playback multipliers (`0.5×`, `1×`, `2×`, `5×`) simply scale the accumulator accumulation rate without modifying tick resolution.
* Single-tick stepping: When paused, calling `clock.step()` advances the world by exactly one 50ms interval for surgical failure diagnosis.

### Visual Interpolation (`CanvasRenderer.ts`)
* The Canvas render loop runs on browser `requestAnimationFrame`.
* Packet positions are calculated along cubic bezier curves using progress $t \in [0.0, 1.0]$.
* State changes emitted at 20 Hz are smoothly interpolated by the particle renderer at 60+ FPS.

---

## 3. Resource & Health Modeling

### Resource Saturation
* **CPU Utilization**: Base operating system load + proportional load per concurrent in-flight request ($(\text{active} / \text{maxCapacity}) \times 90\%$).
* **Memory (RAM)**: Base daemon footprint + allocation per active client socket.
* **Connection Pool**: Saturated when concurrent sockets reach the configured maximum limit.

### Health Transitions
Health is not binary. Nodes progress through states:
$$\text{HEALTHY} \longrightarrow \text{DEGRADED} \longrightarrow \text{OVERLOADED} \longrightarrow \text{FAILING}$$
* Latency increases non-linearly under load.
* At 100% CPU or max connections, incoming requests drop with HTTP 502/504 errors.
