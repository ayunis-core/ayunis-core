import type { PiiCategory } from './pii-category.enum';
import type { PiiDetection } from './pii-detection';
import type { PiiMask } from './pii-mask';
import { formatPiiToken } from './pii-mask';

export interface MaskReplacementResult {
  anonymizedText: string;
  /** Masks created for values not covered by existingMasks. */
  newMasks: PiiMask[];
}

/**
 * Replaces each detected span with its `{{pii:CATEGORY_n}}` token, reusing
 * existing masks so the same (category, value) pair always yields the same
 * token across a thread. Detections must be non-overlapping (see
 * dropOverlappingResults in the engine adapter); replacing from end to start
 * preserves earlier offsets.
 */
export function applyMaskReplacements(
  text: string,
  detections: PiiDetection[],
  existingMasks: PiiMask[],
): MaskReplacementResult {
  if (detections.length === 0) {
    return { anonymizedText: text, newMasks: [] };
  }

  const registry = createMaskRegistry(existingMasks);

  // Resolve in document order so indices read naturally, replace end-to-start.
  const inDocumentOrder = [...detections].sort((a, b) => a.start - b.start);
  const masks = new Map(
    inDocumentOrder.map((detection) => [
      detection,
      registry.resolve(
        detection.category,
        text.slice(detection.start, detection.end),
      ),
    ]),
  );

  let anonymizedText = text;
  for (const detection of [...detections].sort((a, b) => b.end - a.end)) {
    anonymizedText =
      anonymizedText.substring(0, detection.start) +
      formatPiiToken(masks.get(detection) as PiiMask) +
      anonymizedText.substring(detection.end);
  }

  return { anonymizedText, newMasks: registry.newMasks };
}

interface MaskRegistry {
  resolve(category: PiiCategory, value: string): PiiMask;
  newMasks: PiiMask[];
}

function createMaskRegistry(existingMasks: PiiMask[]): MaskRegistry {
  const masksByValue = new Map<string, PiiMask>(
    existingMasks.map((mask) => [maskKey(mask.category, mask.value), mask]),
  );
  const nextIndexByCategory = new Map<PiiCategory, number>();
  for (const mask of existingMasks) {
    const next = nextIndexByCategory.get(mask.category) ?? 1;
    nextIndexByCategory.set(mask.category, Math.max(next, mask.maskIndex + 1));
  }

  const newMasks: PiiMask[] = [];
  const resolve = (category: PiiCategory, value: string): PiiMask => {
    const key = maskKey(category, value);
    const existing = masksByValue.get(key);
    if (existing) {
      return existing;
    }
    const maskIndex = nextIndexByCategory.get(category) ?? 1;
    nextIndexByCategory.set(category, maskIndex + 1);
    const mask: PiiMask = { category, maskIndex, value };
    masksByValue.set(key, mask);
    newMasks.push(mask);
    return mask;
  };

  return { resolve, newMasks };
}

function maskKey(category: PiiCategory, value: string): string {
  return `${category} ${value}`;
}
