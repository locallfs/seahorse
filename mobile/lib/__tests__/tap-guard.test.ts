import { describe, expect, it } from 'vitest';
import { createTapGuard, DEFAULT_TAP_WINDOW_MS } from '../tap-guard';

describe('createTapGuard', () => {
  it('accepts the first tap', () => {
    const g = createTapGuard(800);
    expect(g.accept(1_000)).toBe(true);
  });

  it('swallows a second tap inside the window', () => {
    // The actual bug: two taps on one row stacked two identical edit screens,
    // so the first Back landed on the twin and looked like a dead button.
    const g = createTapGuard(800);
    expect(g.accept(1_000)).toBe(true);
    expect(g.accept(1_120)).toBe(false);
    expect(g.accept(1_700)).toBe(false);
  });

  it('accepts again once the window has passed', () => {
    const g = createTapGuard(800);
    expect(g.accept(1_000)).toBe(true);
    expect(g.accept(1_800)).toBe(true);
  });

  it('never swallows a tap permanently, even with no release', () => {
    const g = createTapGuard(800);
    g.accept(1_000);
    // A navigation that never happened must not leave the row dead forever.
    expect(g.accept(99_999)).toBe(true);
  });

  it('re-arms immediately on release', () => {
    const g = createTapGuard(800);
    expect(g.accept(1_000)).toBe(true);
    expect(g.accept(1_100)).toBe(false);
    g.release();
    expect(g.accept(1_100)).toBe(true);
  });

  it('restarts the window on each accepted tap', () => {
    const g = createTapGuard(800);
    expect(g.accept(1_000)).toBe(true);
    expect(g.accept(1_900)).toBe(true);
    expect(g.accept(2_000)).toBe(false);
  });

  it('ships a window long enough to cover a double tap', () => {
    // Comfortably above the ~300ms a human double tap spans.
    expect(DEFAULT_TAP_WINDOW_MS).toBeGreaterThanOrEqual(500);
  });
});
