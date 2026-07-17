import { randomUUID } from 'crypto';
import type { UUID } from 'crypto';
import type {
  AssistantMessage as InferenceAssistantMessage,
  Message as InferenceMessage,
  MessageContent as InferenceMessageContent,
} from '@ayunis/inference';
import { AssistantMessage } from 'src/domain/messages/domain/messages/assistant-message.entity';
import { ToolResultMessage } from 'src/domain/messages/domain/messages/tool-result-message.entity';
import { TextMessageContent } from 'src/domain/messages/domain/message-contents/text-message-content.entity';
import { ThinkingMessageContent } from 'src/domain/messages/domain/message-contents/thinking-message-content.entity';
import { ToolUseMessageContent } from 'src/domain/messages/domain/message-contents/tool-use.message-content.entity';
import { ToolResultMessageContent } from 'src/domain/messages/domain/message-contents/tool-result.message-content.entity';

type BackendAssistantContent =
  TextMessageContent | ToolUseMessageContent | ThinkingMessageContent;

/**
 * Reverse of `models`' `toInferenceMessages`: rebuilds the backend's domain
 * messages from the provider-agnostic `@ayunis/inference` messages the agent
 * runtime accumulates. Used both to stream assistant/tool-result turns and to
 * persist them (the persistence hook maps the same runtime messages).
 */
export function toBackendAssistantMessage(
  message: InferenceAssistantMessage,
  threadId: UUID,
  id: UUID = randomUUID(),
): AssistantMessage {
  const content = message.content
    .map(toBackendAssistantContent)
    .filter((c): c is BackendAssistantContent => c !== null);
  return new AssistantMessage({ id, threadId, content });
}

function toBackendAssistantContent(
  content: InferenceMessageContent,
): BackendAssistantContent | null {
  switch (content.type) {
    case 'text':
      return new TextMessageContent(
        content.text,
        content.providerMetadata ?? null,
      );
    case 'thinking':
      return new ThinkingMessageContent(
        content.thinking,
        content.id ?? null,
        content.signature ?? null,
      );
    case 'tool_use':
      return new ToolUseMessageContent(
        content.id,
        content.name,
        content.input,
        content.providerMetadata ?? null,
      );
    case 'tool_result':
    case 'image':
      return null;
  }
}

export function toBackendToolResultMessage(
  message: InferenceMessage,
  threadId: UUID,
  id: UUID = randomUUID(),
): ToolResultMessage {
  const content = message.content
    .filter((c) => c.type === 'tool_result')
    .map(
      (c) => new ToolResultMessageContent(c.toolCallId, c.toolName, c.result),
    );
  return new ToolResultMessage({ id, threadId, content });
}
