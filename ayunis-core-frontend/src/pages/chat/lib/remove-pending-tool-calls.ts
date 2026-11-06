import type {
  AssistantMessageContent,
  Message,
} from '@/pages/chat/model/openapi';

const isStreamingToolCall = (content: AssistantMessageContent): boolean =>
  content.type === 'tool_use' &&
  'stream' in content &&
  content.stream?.status === 'streaming';

/**
 * Drops the tool calls of the last assistant message after a cancelled run.
 * A message that only names tools still being prepared was never saved, so
 * it is removed entirely.
 */
export function removePendingToolCalls(messages: Message[]): Message[] {
  const lastMessage = messages.at(-1);
  if (lastMessage?.role !== 'assistant') return messages;
  const cleanedContent = lastMessage.content.filter(
    (c) => c.type === 'text' || c.type === 'thinking',
  );
  if (cleanedContent.length > 0) {
    return [
      ...messages.slice(0, -1),
      { ...lastMessage, content: cleanedContent },
    ];
  }
  const onlyPreparesTools =
    lastMessage.content.length > 0 &&
    lastMessage.content.every(isStreamingToolCall);
  return onlyPreparesTools ? messages.slice(0, -1) : messages;
}
