import type { ChatMenuStatus } from '@ayunis/chat/surface';

export function queryStatus(query: {
  isLoading: boolean;
  error: unknown;
}): ChatMenuStatus {
  if (query.isLoading) return 'loading';
  return query.error ? 'error' : 'ready';
}
