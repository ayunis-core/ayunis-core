import type { PiiCategory } from './pii-category.enum';
import type { PiiDetection } from './pii-detection';
import type { PiiWhitelistEntry } from './pii-whitelist-entry';

type EntriesByCategory = Map<PiiCategory, PiiWhitelistEntry>;

/**
 * Drops detections that the org whitelist exempts from anonymization.
 * Fail-safe: detections without a mapped category and entries with invalid
 * patterns never exempt anything.
 */
export function filterWhitelistedDetections(
  detections: PiiDetection[],
  entries: PiiWhitelistEntry[],
): PiiDetection[] {
  if (entries.length === 0) {
    return detections;
  }
  const entriesByCategory = new Map(
    entries.map((entry) => [entry.category, entry]),
  );
  return detections.filter(
    (detection) => !isExempt(detection, entriesByCategory),
  );
}

export function isExempt(
  detection: PiiDetection,
  entriesByCategory: EntriesByCategory,
): boolean {
  if (!detection.category) {
    return false;
  }
  const entry = entriesByCategory.get(detection.category);
  if (!entry) {
    return false;
  }
  if (entry.pattern === null) {
    return true;
  }
  return fullyMatches(entry.pattern, detection.text);
}

export function fullyMatches(pattern: string, value: string): boolean {
  try {
    return new RegExp(`^(?:${pattern})$`, 'i').test(value);
  } catch {
    return false;
  }
}
