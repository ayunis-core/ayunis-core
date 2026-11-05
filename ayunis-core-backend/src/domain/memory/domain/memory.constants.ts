/**
 * `personal` and `preferences` are always offered to the model and always
 * rendered in full in the system prompt. They are virtual: no row exists until
 * the model writes one, and clearing them removes the row rather than the key.
 */
export const RESERVED_MEMORY_KEYS = ['personal', 'preferences'] as const;

export type ReservedMemoryKey = (typeof RESERVED_MEMORY_KEYS)[number];

export const MEMORY_KEY_MAX_LENGTH = 48;
export const MEMORY_CONTENT_MAX_LENGTH = 2000;
export const MEMORY_MAX_ENTRIES_PER_USER = 50;

const MEMORY_KEY_PATTERN = /^[a-z][a-z0-9_]*$/;

export function isReservedMemoryKey(key: string): key is ReservedMemoryKey {
  return (RESERVED_MEMORY_KEYS as readonly string[]).includes(key);
}

export function isValidMemoryKey(key: string): boolean {
  return key.length <= MEMORY_KEY_MAX_LENGTH && MEMORY_KEY_PATTERN.test(key);
}
