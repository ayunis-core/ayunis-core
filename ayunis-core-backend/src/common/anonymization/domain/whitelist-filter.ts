import type { PiiCategory } from './pii-category.enum';
import type { PiiDetection } from './pii-detection';
import type { PiiWhitelistEntry } from './pii-whitelist-entry';

type EntriesByCategory = Map<PiiCategory, PiiWhitelistEntry[]>;

/**
 * Drops detections that the whitelist exempts from anonymization. Entries may
 * repeat a category (org rule plus global words); a detection is exempt as
 * soon as any entry of its category matches — union semantics.
 * Fail-safe: entries with invalid patterns never exempt anything.
 */
export function filterWhitelistedDetections(
  detections: PiiDetection[],
  entries: PiiWhitelistEntry[],
): PiiDetection[] {
  if (entries.length === 0) {
    return detections;
  }
  const entriesByCategory: EntriesByCategory = new Map();
  for (const entry of entries) {
    const existing = entriesByCategory.get(entry.category);
    if (existing) {
      existing.push(entry);
    } else {
      entriesByCategory.set(entry.category, [entry]);
    }
  }
  return detections.filter(
    (detection) => !isExempt(detection, entriesByCategory),
  );
}

export function isExempt(
  detection: PiiDetection,
  entriesByCategory: EntriesByCategory,
): boolean {
  const entries = entriesByCategory.get(detection.category);
  if (!entries) {
    return false;
  }
  return entries.some(
    (entry) =>
      entry.pattern === null || fullyMatches(entry.pattern, detection.text),
  );
}

export function fullyMatches(pattern: string, value: string): boolean {
  try {
    return new RegExp(`^(?:${pattern})$`, 'i').test(value);
  } catch {
    return false;
  }
}
