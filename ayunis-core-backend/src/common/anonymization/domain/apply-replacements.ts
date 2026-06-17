import type { PiiDetection } from './pii-detection';

/**
 * Replaces each detected span with its `[ENTITY_TYPE]` placeholder.
 * Detections must be non-overlapping (see dropOverlappingResults in the
 * engine adapter); replacing from end to start preserves earlier offsets.
 */
export function applyReplacements(
  text: string,
  detections: PiiDetection[],
): string {
  if (detections.length === 0) {
    return text;
  }

  const sorted = [...detections].sort((a, b) => b.end - a.end);

  let anonymizedText = text;
  for (const detection of sorted) {
    anonymizedText =
      anonymizedText.substring(0, detection.start) +
      `[${detection.entityType}]` +
      anonymizedText.substring(detection.end);
  }

  return anonymizedText;
}
