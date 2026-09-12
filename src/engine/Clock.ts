/**
 * Clock.ts
 * 
 * Deterministic fixed-timestep simulation clock.
 * Default tick rate: 20 Hz (50 ms per tick).
 * Completely decoupled from display refresh rate.
 */

export type TickListener = (tick: number, simTimeSeconds: number, dtSeconds: number) => void;

export class SimulationClock {
  public readonly tickRateHz: number = 20;
  public readonly tickDurationMs: number = 1000 / 20; // 50ms
  public readonly tickDurationSeconds: number = 0.05;

  private currentTick: number = 0;
  private isPaused: boolean = false;
  private speedMultiplier: number = 1.0;
  private accumulatorMs: number = 0;
  private listeners: Set<TickListener> = new Set();
  
  private lastRealTimeMs: number = 0;
  private animFrameId: number | null = null;
  private isRunning: boolean = false;

  constructor(initialTickRateHz = 20) {
    this.tickRateHz = initialTickRateHz;
    this.tickDurationMs = 1000 / this.tickRateHz;
    this.tickDurationSeconds = this.tickDurationMs / 1000;
  }

  public subscribe(listener: TickListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  public start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastRealTimeMs = performance.now();
    this.loop();
  }

  public stop(): void {
    this.isRunning = false;
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
  }

  public setPaused(paused: boolean): void {
    this.isPaused = paused;
  }

  public togglePause(): boolean {
    this.isPaused = !this.isPaused;
    return this.isPaused;
  }

  public getIsPaused(): boolean {
    return this.isPaused;
  }

  public setSpeed(multiplier: number): void {
    if (multiplier > 0) {
      this.speedMultiplier = multiplier;
    }
  }

  public getSpeed(): number {
    return this.speedMultiplier;
  }

  public getTick(): number {
    return this.currentTick;
  }

  public getSimTimeSeconds(): number {
    return this.currentTick * this.tickDurationSeconds;
  }

  /**
   * Manually advances the clock by exactly one tick.
   * Useful when paused or for unit testing.
   */
  public step(): void {
    this.currentTick++;
    const simTime = this.getSimTimeSeconds();
    this.notifyListeners(this.currentTick, simTime, this.tickDurationSeconds);
  }

  /**
   * Process variable delta real-time with accumulator for fixed simulation ticks.
   */
  public update(realDeltaMs: number): number {
    if (this.isPaused) {
      return 0;
    }

    // Cap delta time to prevent spiral of death on tab unfocus (max 250ms)
    const clampedDelta = Math.min(realDeltaMs, 250);
    this.accumulatorMs += clampedDelta * this.speedMultiplier;

    let ticksExecuted = 0;
    while (this.accumulatorMs >= this.tickDurationMs) {
      this.currentTick++;
      ticksExecuted++;
      this.accumulatorMs -= this.tickDurationMs;

      const simTime = this.getSimTimeSeconds();
      this.notifyListeners(this.currentTick, simTime, this.tickDurationSeconds);
    }

    return ticksExecuted;
  }

  public reset(): void {
    this.currentTick = 0;
    this.accumulatorMs = 0;
  }

  private loop = (): void => {
    if (!this.isRunning) return;

    const now = performance.now();
    const deltaMs = now - this.lastRealTimeMs;
    this.lastRealTimeMs = now;

    this.update(deltaMs);

    this.animFrameId = requestAnimationFrame(this.loop);
  };

  private notifyListeners(tick: number, simTime: number, dt: number): void {
    for (const listener of this.listeners) {
      try {
        listener(tick, simTime, dt);
      } catch (err) {
        console.error('SimulationClock listener error:', err);
      }
    }
  }
}
