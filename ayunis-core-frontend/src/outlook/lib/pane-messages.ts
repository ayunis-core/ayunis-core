import type {
  AssistantMessageResponseDto,
  GetThreadResponseDto,
  ToolUseMessageContentResponseDto,
} from '@/shared/api/generated/ayunisCoreAPI.schemas';
import {
  isOutlookTool,
  type OutlookToolName,
} from '@/outlook/lib/outlook-tools';

export type PaneMessage = GetThreadResponseDto['messages'][number];

export interface OutlookToolCall {
  id: string;
  name: OutlookToolName;
  params: Record<string, unknown>;
}

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

function isToolUse(
  content: AssistantMessageResponseDto['content'][number],
): content is ToolUseMessageContentResponseDto {
  return content.type === 'tool_use';
}

/**
 * Finished, valid Outlook tool calls in message order. A call the model is
 * still streaming or sent with invalid input carries `stream`; the backend
 * answers an invalid one itself.
 */
export function outlookToolCalls(messages: PaneMessage[]): OutlookToolCall[] {
  return messages.flatMap((message) =>
    message.role === 'assistant'
      ? message.content
          .filter(isToolUse)
          .filter((call) => !call.stream && isOutlookTool(call.name))
          .map((call) => ({
            id: call.id,
            name: call.name as OutlookToolName,
            params: call.params,
          }))
      : [],
  );
}

/**
 * True while a call of the last turn is held for the user's confirmation.
 * The pane cannot answer those, so it must not act on that turn at all.
 */
export function hasCallAwaitingConfirmation(messages: PaneMessage[]): boolean {
  const answered = answeredToolCallIds(messages);
  return messages.some(
    (message) =>
      message.role === 'assistant' &&
      message.content
        .filter(isToolUse)
        .some((call) => call.requiresConfirmation && !answered.has(call.id)),
  );
}

export function answeredToolCallIds(messages: PaneMessage[]): Set<string> {
  return new Set(
    messages.flatMap((message) =>
      message.role === 'tool'
        ? message.content.map((content) => content.toolId)
        : [],
    ),
  );
}
