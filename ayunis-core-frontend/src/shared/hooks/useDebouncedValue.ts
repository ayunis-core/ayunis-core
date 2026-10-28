import { useEffect, useState } from 'react';

/**
 * Returns a copy of `value` that only updates after it has stayed unchanged
 * for `delayMs`. Useful for throttling network requests driven by fast-changing
 * inputs such as a search box.
 */
export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedValue(value), delayMs);
    return () => clearTimeout(timeout);
  }, [value, delayMs]);

  return debouncedValue;
}
