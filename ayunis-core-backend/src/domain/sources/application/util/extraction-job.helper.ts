import type { UUID } from 'crypto';

/** Contract §5: unique per upload through the source id, bound to the bytes through the hash. */
export function buildExtractionIdempotencyKey(
  sourceId: UUID,
  sha256: string,
): string {
  return `v1:${sourceId}:${sha256}`;
}

/** Inside the processing prefix so the existing purge covers results and checkpoints. */
export function buildExtractionOutputPrefix(
  orgId: UUID,
  sourceId: UUID,
): string {
  return `${orgId}/processing/${sourceId}/extraction/`;
}
