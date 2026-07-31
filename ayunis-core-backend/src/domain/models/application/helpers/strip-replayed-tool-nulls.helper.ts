import { AssistantMessage } from 'src/domain/messages/domain/messages/assistant-message.entity';
import { ToolUseMessageContent } from 'src/domain/messages/domain/message-contents/tool-use.message-content.entity';
import type { Message } from 'src/domain/messages/domain/message.entity';
import { stripDisallowedNulls } from 'src/common/util/strip-disallowed-nulls';
import type { ToolSchema } from '../../domain/value-objects/tool-schema';

type ToolParameters = ToolSchema['parameters'];

/**
 * Replayed assistant tool calls keep whatever params the model originally
 * emitted — including schema-disallowed nulls from strict-mode providers.
 * Left in the history they teach the next turn's model to imitate the
 * pattern (regardless of provider), so outbound requests get copies with
 * those nulls removed. Persisted entities are never mutated; messages that
 * need no change pass through as the same instance.
 */
export function stripReplayedToolNulls(
  messages: Message[],
  tools: readonly ToolSchema[],
): Message[] {
  if (tools.length === 0) {
    return messages;
  }
  const parametersByName = new Map<string, ToolParameters>(
    tools.map((tool) => [tool.name, tool.parameters]),
  );
  const sanitized = messages.map((message) =>
    message instanceof AssistantMessage
      ? sanitizeAssistantMessage(message, parametersByName)
      : message,
  );
  return sanitized.every((message, index) => message === messages[index])
    ? messages
    : sanitized;
}

function sanitizeAssistantMessage(
  message: AssistantMessage,
  parametersByName: Map<string, ToolParameters>,
): AssistantMessage {
  const content = message.content.map((block) =>
    block instanceof ToolUseMessageContent
      ? sanitizeToolUse(block, parametersByName)
      : block,
  );
  if (content.every((block, index) => block === message.content[index])) {
    return message;
  }
  return new AssistantMessage({
    id: message.id,
    threadId: message.threadId,
    createdAt: message.createdAt,
    content,
  });
}

function sanitizeToolUse(
  block: ToolUseMessageContent,
  parametersByName: Map<string, ToolParameters>,
): ToolUseMessageContent {
  const parameters = parametersByName.get(block.name);
  if (parameters === undefined) {
    return block;
  }
  const stripped = stripDisallowedNulls(block.params, parameters);
  if (stripped === block.params) {
    return block;
  }
  return new ToolUseMessageContent(
    block.id,
    block.name,
    stripped,
    block.providerMetadata,
    block.integration,
  );
}
