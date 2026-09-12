import { describe, it, expect } from 'vitest';
import { SimulationClock } from '../src/engine/Clock';

describe('SimulationClock', () => {
  it('initializes at tick 0 and 0 seconds', () => {
    const clock = new SimulationClock(20);
    expect(clock.getTick()).toBe(0);
    expect(clock.getSimTimeSeconds()).toBe(0);
    expect(clock.tickDurationMs).toBe(50);
  });

  it('steps single tick manually when stepped', () => {
    const clock = new SimulationClock(20);
    let notifiedTick = -1;
    clock.subscribe((tick) => {
      notifiedTick = tick;
    });

    clock.step();
    expect(clock.getTick()).toBe(1);
    expect(clock.getSimTimeSeconds()).toBeCloseTo(0.05);
    expect(notifiedTick).toBe(1);

    clock.step();
    expect(clock.getTick()).toBe(2);
    expect(clock.getSimTimeSeconds()).toBeCloseTo(0.10);
  });

  it('accumulates variable delta times deterministically', () => {
    const clock = new SimulationClock(20); // 50ms per tick
    
    // 30ms: not enough for 1 tick yet
    const t1 = clock.update(30);
    expect(t1).toBe(0);
    expect(clock.getTick()).toBe(0);

    // Another 30ms (total 60ms): should execute 1 tick, 10ms remaining
    const t2 = clock.update(30);
    expect(t2).toBe(1);
    expect(clock.getTick()).toBe(1);

    // Another 90ms (total remaining 100ms): should execute exactly 2 ticks
    const t3 = clock.update(90);
    expect(t3).toBe(2);
    expect(clock.getTick()).toBe(3);
  });

  it('respects pause and speed multipliers', () => {
    const clock = new SimulationClock(20);

    clock.setPaused(true);
    const pausedTicks = clock.update(200);
    expect(pausedTicks).toBe(0);
    expect(clock.getTick()).toBe(0);

    clock.setPaused(false);
    clock.setSpeed(2.0); // 2x speed

    // 50ms at 2x = 100ms virtual = 2 ticks
    const fastTicks = clock.update(50);
    expect(fastTicks).toBe(2);
    expect(clock.getTick()).toBe(2);
  });
});
