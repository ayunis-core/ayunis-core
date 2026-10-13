import { ModelProviderError } from '@ayunis/inference';

const MAX_CAUSE_DEPTH = 8;

export function findPortableProviderError(
  error: unknown,
): ModelProviderError | undefined {
  let current: unknown = error;
  const seen = new Set<unknown>();
  for (let depth = 0; depth < MAX_CAUSE_DEPTH; depth++) {
    if (current instanceof ModelProviderError) return current;
    if (typeof current !== 'object' || current === null || seen.has(current)) {
      return undefined;
    }
    seen.add(current);
    current = (current as { cause?: unknown }).cause;
  }
  return undefined;
}
