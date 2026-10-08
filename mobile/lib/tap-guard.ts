/**
 * Swallows a repeated tap that lands before the first one has taken effect.
 * Pure and time-injected so it is unit tested; no React or RN imports.
 *
 * Needed because `router.push` always pushes a new screen — it never
 * deduplicates. Two taps on the same product row therefore stack two identical
 * edit screens, and the first Back pops onto the twin: same product, same
 * fields, no visible change. That reads as "the Back button did nothing".
 *
 * The lock expires on its own, so a tap can never be permanently swallowed
 * even if the navigation it guarded never happened.
 */
export type TapGuard = {
  /** True when this tap should act; false when it repeats inside the window. */
  accept: (now: number) => boolean;
  /** Re-arm immediately, e.g. once the screen is focused again. */
  release: () => void;
};

export const DEFAULT_TAP_WINDOW_MS = 800;

export function createTapGuard(windowMs = DEFAULT_TAP_WINDOW_MS): TapGuard {
  let lockedUntil = 0;
  return {
    accept(now: number): boolean {
      if (now < lockedUntil) return false;
      lockedUntil = now + windowMs;
      return true;
    },
    release(): void {
      lockedUntil = 0;
    },
  };
}
