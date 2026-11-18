import type { GetThreadResponseDto } from '@/shared/api/generated/ayunisCoreAPI.schemas';

export {
  answeredToolCallIds,
  hasCallAwaitingConfirmation,
  outlookToolCalls,
  type OutlookToolCall,
} from '@/features/outlook-tools';

export type PaneMessage = GetThreadResponseDto['messages'][number];

const LOCAL_ID_PREFIX = 'local-';

export function localUserMessage(threadId: string, text: string): PaneMessage {
  return {
    id: `${LOCAL_ID_PREFIX}${Date.now()}`,
    threadId,
    createdAt: new Date().toISOString(),
    role: 'user',
    content: [{ type: 'text', text }],
  };
}

/**
 * Run events carry full message snapshots, so a message is replaced by id.
 * The saved user message replaces the one shown while it was being sent.
 */
export function upsertMessage(
  messages: PaneMessage[],
  message: PaneMessage,
): PaneMessage[] {
  const index = messages.findIndex(({ id }) => id === message.id);
  if (index >= 0) {
    return messages.map((existing, i) => (i === index ? message : existing));
  }
  const kept =
    message.role === 'user'
      ? messages.filter(({ id }) => !id.startsWith(LOCAL_ID_PREFIX))
      : messages;
  return [...kept, message];
}
