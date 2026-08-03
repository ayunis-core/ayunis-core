import type {
  AssistantMessageContent,
  Message,
  Thread,
  ToolUseMessageContent,
} from '@/pages/chat/model/openapi';

function isToolUseContent(
  content: AssistantMessageContent,
): content is ToolUseMessageContent {
  return content.type === 'tool_use' && 'id' in content && 'params' in content;
}

function getInvalidToolCalls(message: Message): ToolUseMessageContent[] {
  if (message.role !== 'assistant') return [];
  return message.content.filter(
    (content): content is ToolUseMessageContent =>
      isToolUseContent(content) && content.stream?.status === 'invalid',
  );
}

function mergeInvalidToolCalls(
  message: Message,
  invalidToolCalls: readonly ToolUseMessageContent[],
): Message {
  if (message.role !== 'assistant') return message;
  const existingIds = new Set(
    message.content.filter(isToolUseContent).map((content) => content.id),
  );
  const missing = invalidToolCalls.filter(
    (toolCall) => !existingIds.has(toolCall.id),
  );
  return missing.length === 0
    ? message
    : { ...message, content: [...message.content, ...missing] };
}

function toInvalidOnlyMessage(message: Message): Message | null {
  const invalidToolCalls = getInvalidToolCalls(message);
  return invalidToolCalls.length === 0
    ? null
    : ({ ...message, content: invalidToolCalls } as Message);
}

function interleaveMissingInvalidMessages(
  reconciledMessages: readonly Message[],
  currentMessages: readonly Message[],
  persistedIds: ReadonlySet<string>,
): Message[] {
  const missingBeforeId = new Map<string, Message[]>();
  let pending: Message[] = [];
  for (const message of currentMessages) {
    if (persistedIds.has(message.id)) {
      if (pending.length > 0) missingBeforeId.set(message.id, pending);
      pending = [];
      continue;
    }
    const invalidOnlyMessage = toInvalidOnlyMessage(message);
    if (invalidOnlyMessage) pending.push(invalidOnlyMessage);
  }
  return reconciledMessages
    .flatMap((message) => [...(missingBeforeId.get(message.id) ?? []), message])
    .concat(pending);
}

export function reconcileMessages(
  currentMessages: readonly Message[],
  previousThread: Pick<Thread, 'id'>,
  nextThread: Pick<Thread, 'id' | 'messages'>,
): Message[] {
  if (previousThread.id !== nextThread.id) return nextThread.messages;
  const persistedMessages = nextThread.messages;
  const invalidByMessageId = new Map<string, ToolUseMessageContent[]>();
  for (const message of currentMessages) {
    const invalidToolCalls = getInvalidToolCalls(message);
    if (invalidToolCalls.length > 0) {
      invalidByMessageId.set(message.id, invalidToolCalls);
    }
  }

  const persistedIds = new Set(persistedMessages.map((message) => message.id));
  const reconciled = persistedMessages.map((message) =>
    mergeInvalidToolCalls(message, invalidByMessageId.get(message.id) ?? []),
  );
  return interleaveMissingInvalidMessages(
    reconciled,
    currentMessages,
    persistedIds,
  );
}
