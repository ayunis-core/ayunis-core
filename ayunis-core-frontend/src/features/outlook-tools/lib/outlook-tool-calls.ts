import type {
  AssistantMessageResponseDto,
  GetThreadResponseDto,
  ToolUseMessageContentResponseDto,
} from '@ayunis/api-client/schemas';
import {
  isOutlookTool,
  type OutlookToolName,
} from '@/features/outlook-tools/lib/outlook-tool-names';

type ThreadMessage = GetThreadResponseDto['messages'][number];

export interface OutlookToolCall {
  id: string;
  name: OutlookToolName;
  params: Record<string, unknown>;
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
export function outlookToolCalls(
  messages: readonly ThreadMessage[],
): OutlookToolCall[] {
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
export function hasCallAwaitingConfirmation(
  messages: readonly ThreadMessage[],
): boolean {
  const answered = answeredToolCallIds(messages);
  return messages.some(
    (message) =>
      message.role === 'assistant' &&
      message.content
        .filter(isToolUse)
        .some((call) => call.requiresConfirmation && !answered.has(call.id)),
  );
}

export function answeredToolCallIds(
  messages: readonly ThreadMessage[],
): Set<string> {
  return new Set(
    messages.flatMap((message) =>
      message.role === 'tool'
        ? message.content.map((content) => content.toolId)
        : [],
    ),
  );
}
