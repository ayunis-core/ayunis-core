import type { ContextOrigin } from '@/pages/chat-context-prototype/model/mock';

export const ORIGIN_LABELS: Record<ContextOrigin, string | undefined> = {
  always: undefined,
  user: undefined,
  assistant: 'Automatisch geladen',
  project: 'Aus dem Projekt',
};
