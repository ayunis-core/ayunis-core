import type { ComposerMenuStatus } from '@ayunis/chat/surface';

export function queryStatus(query: {
  isLoading: boolean;
  error: unknown;
}): ComposerMenuStatus {
  if (query.isLoading) return 'loading';
  return query.error ? 'error' : 'ready';
}
