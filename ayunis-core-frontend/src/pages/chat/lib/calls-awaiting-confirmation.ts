import type {
  Message,
  ToolUseMessageContent,
} from '@/pages/chat/model/openapi';

/**
 * IDs of the calls the thread's last turn holds for the user's confirmation.
 * They have no results yet: a turn's results follow it.
 */
export function findCallsAwaitingConfirmation(
  messages: readonly Message[],
): string[] {
  const lastMessage = messages.at(-1);
  if (lastMessage?.role !== 'assistant') return [];
  return lastMessage.content
    .filter((content) => content.type === 'tool_use')
    .map((content) => content as ToolUseMessageContent)
    .filter((call) => call.requiresConfirmation)
    .map((call) => call.id);
}
