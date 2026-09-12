# Contributing to StackWorld

Thank you for your interest in contributing to StackWorld!

StackWorld is an open source visual infrastructure simulator. We welcome contributions ranging from new educational scenarios and infrastructure entity types to performance optimizations and design polish.

---

## 🛠️ Development Setup

### Prerequisites
* **Node.js**: v20+ or v22+
* **pnpm** (recommended) or **npm**

### Quickstart
```bash
# Clone the repository
git clone https://github.com/fazleyrabby/stackworld.git
cd stackworld

# Install dependencies
pnpm install

# Start local dev server
pnpm dev

# Run unit tests
pnpm test

# Build production bundle
pnpm build
```

---

## 📐 Key Engineering Rules

1. **Engine Decoupling (Strict Rule)**:
   * Code in `src/engine/` must **NEVER** import React, Zustand, DOM elements, or canvas objects.
   * The simulation must be 100% testable in headless Node environments via `vitest`.
2. **Vertical Slice Development**:
   * Do not create empty component abstractions months before they are usable.
   * Every new feature must be fully functional end-to-end: Engine + Entity + Visual Canvas Node + Scenario + Test.
3. **Pure Vanilla CSS Design System**:
   * Do not introduce heavy utility frameworks (Tailwind, Bootstrap) or external tweening engines (GSAP).
   * Styling lives in `src/index.css` using custom properties and semantic BEM-like classes.
4. **Deterministic Testing**:
   * Every simulation rule, traffic router, and resource calculator must have deterministic unit test coverage in `tests/`.

---

## 🤝 Pull Request Process

1. Fork the repository and create your feature branch:
   ```bash
   git checkout -b feat/my-new-scenario
   ```
2. Ensure all unit tests and builds pass:
   ```bash
   pnpm test
   pnpm build
   ```
3. Commit your changes with clear semantic commit messages:
   ```bash
   git commit -m "feat(scenario): add DNS round robin challenge"
   ```
4. Push your branch and open a Pull Request against `main`.
