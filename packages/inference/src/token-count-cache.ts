import { createHash } from 'node:crypto';

// Hosts re-count the same history on every chat open and model call, and
// tokenizing runs on the event loop: a 1 MB history takes ~130 ms, hashing it
// ~1 ms. Shorter texts tokenize faster than they hash and are not kept.
const MIN_CACHED_CHARS = 2_000;
// Holds a key and a number per entry, a few megabytes at most.
const MAX_ENTRIES = 50_000;

const counts = new Map<string, number>();

/**
 * Counts `text` once per encoding. Keyed by content, so an edited or growing
 * message is a new entry and a cached count is always the one `count` returns.
 */
export const countWithCache = (
  encoding: string,
  text: string,
  count: (text: string) => number,
): number => {
  if (text.length < MIN_CACHED_CHARS) return count(text);
  const key = `${encoding}:${createHash('sha256').update(text).digest('base64')}`;
  const cached = counts.get(key);
  if (cached !== undefined) {
    // Re-inserting moves the key to the end, so eviction drops the least recently used.
    counts.delete(key);
    counts.set(key, cached);
    return cached;
  }
  const counted = count(text);
  counts.set(key, counted);
  if (counts.size > MAX_ENTRIES) {
    const oldest = counts.keys().next();
    if (!oldest.done) counts.delete(oldest.value);
  }
  return counted;
};
