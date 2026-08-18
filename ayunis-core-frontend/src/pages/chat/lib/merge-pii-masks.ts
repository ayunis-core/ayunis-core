import type { PiiMaskResponseDto } from '@/shared/api';

/**
 * Merges an incoming full mask dictionary (SSE `masks` event) into the local
 * one. Replace-by-token keeps entries from earlier events, and `unmasked` is
 * sticky: unmasking is one-way, so a stale dictionary captured by an
 * in-flight run before the unmask must never flip a term back to masked.
 */
export function mergePiiMasks(
  prev: readonly PiiMaskResponseDto[],
  incoming: readonly PiiMaskResponseDto[],
): PiiMaskResponseDto[] {
  const byToken = new Map(prev.map((mask) => [mask.token, mask]));
  for (const mask of incoming) {
    const existing = byToken.get(mask.token);
    byToken.set(
      mask.token,
      existing?.unmasked && !mask.unmasked ? { ...mask, unmasked: true } : mask,
    );
  }
  return [...byToken.values()];
}
