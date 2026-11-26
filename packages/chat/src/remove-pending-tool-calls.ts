import type { ChatThreadSnapshot } from './chat-conversation-config';

type Message = ChatThreadSnapshot['messages'][number];
type AssistantContent = Extract<
  Message,
  { role: 'assistant' }
>['content'][number];

function isStreamingToolCall(content: AssistantContent): boolean {
  return (
    content.type === 'tool_use' &&
    'stream' in content &&
    content.stream?.status === 'streaming'
  );
}

export function removePendingToolCalls(messages: Message[]): Message[] {
  const lastMessage = messages.at(-1);
  if (lastMessage?.role !== 'assistant') return messages;
  const cleanedContent = lastMessage.content.filter(
    (content) => content.type === 'text' || content.type === 'thinking',
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
