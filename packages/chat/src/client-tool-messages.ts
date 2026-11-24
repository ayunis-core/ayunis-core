import type {
  AssistantMessageResponseDto,
  GetThreadResponseDto,
  ToolUseMessageContentResponseDto,
} from '@ayunis/api-client/schemas';
import type { ClientToolCall } from './client-tools';

export type ClientToolMessage = GetThreadResponseDto['messages'][number];

function isToolUse(
  content: AssistantMessageResponseDto['content'][number],
): content is ToolUseMessageContentResponseDto {
  return content.type === 'tool_use';
}

function toolUses(messages: readonly ClientToolMessage[]) {
  return messages.flatMap((message) =>
    message.role === 'assistant' ? message.content.filter(isToolUse) : [],
  );
}

export function latestToolMessages(messages: readonly ClientToolMessage[]) {
  for (let index = messages.length - 1; index >= 0; index--) {
    if (messages[index].role === 'user') return messages.slice(index + 1);
  }
  return messages;
}

export function listClientToolCalls(
  messages: readonly ClientToolMessage[],
): ClientToolCall[] {
  return toolUses(messages)
    .filter((call) => !call.stream && !call.requiresConfirmation)
    .map(({ id, name, params }) => ({ id, name, params }));
}

export function answeredToolCallIds(messages: readonly ClientToolMessage[]) {
  return new Set(
    messages.flatMap((message) =>
      message.role === 'tool'
        ? message.content.map(({ toolId }) => toolId)
        : [],
    ),
  );
}

export function hasPendingToolApproval(messages: readonly ClientToolMessage[]) {
  const turn = latestToolMessages(messages);
  const answered = answeredToolCallIds(turn);
  return toolUses(turn).some(
    (call) => call.requiresConfirmation && !answered.has(call.id),
  );
}
