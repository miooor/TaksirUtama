import type { MovementDirection } from "@/types/progress";

/** Five-percentage-point threshold for meaningful movement. */
export const MOVEMENT_THRESHOLD = 5;

/**
 * Normalize a raw mark to a 0–100 percentage.
 * Returns null when the mark is null or maxMark is zero/invalid.
 */
export function toPercent(mark: number | null, maxMark: number): number | null {
  if (mark === null || !Number.isFinite(mark)) return null;
  if (!Number.isFinite(maxMark) || maxMark <= 0) return null;
  return (mark / maxMark) * 100;
}

/**
 * Classify a delta (in percentage points) into a movement direction.
 * - improved: delta >= +5
 * - declined: delta <= -5
 * - stable: between -5 and +5 (exclusive)
 * - incomplete: delta is null
 */
export function classifyMovement(delta: number | null): MovementDirection {
  if (delta === null) return "incomplete";
  if (delta >= MOVEMENT_THRESHOLD) return "improved";
  if (delta <= -MOVEMENT_THRESHOLD) return "declined";
  return "stable";
}
