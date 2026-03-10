/**
 * Calculate usage as a rounded percentage clamped to [0, 100].
 * Returns 0 when `total` is zero to avoid division-by-zero.
 */
export function computeUsagePercent(used: number, total: number): number {
  return total > 0 ? Math.min(100, Math.round((used / total) * 100)) : 0;
}
