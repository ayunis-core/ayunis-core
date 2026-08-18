import { deanonymizeText } from 'src/common/anonymization/domain/deanonymize-text';
import type { Message } from 'src/domain/messages/domain/message.entity';
import type { MessageContent } from 'src/domain/messages/domain/message-content.entity';
import { TextMessageContent } from 'src/domain/messages/domain/message-contents/text-message-content.entity';
import { ToolResultMessageContent } from 'src/domain/messages/domain/message-contents/tool-result.message-content.entity';
import { ToolUseMessageContent } from 'src/domain/messages/domain/message-contents/tool-use.message-content.entity';
import { UserMessage } from 'src/domain/messages/domain/messages/user-message.entity';
import { AssistantMessage } from 'src/domain/messages/domain/messages/assistant-message.entity';
import { SystemMessage } from 'src/domain/messages/domain/messages/system-message.entity';
import { ToolResultMessage } from 'src/domain/messages/domain/messages/tool-result-message.entity';

/**
 * Replaces the `{{pii:…}}` tokens of manually unmasked dictionary entries
 * with their original values, so the LLM sees those terms in clear text.
 * Messages are cloned, never mutated — stored content stays tokenized.
 * Thinking content is left untouched: providers verify its signatures.
 */
export function revealUnmaskedTermsInMessages(
  messages: readonly Message[],
  tokenToValue: ReadonlyMap<string, string>,
): Message[] {
  if (tokenToValue.size === 0) return [...messages];
  return messages.map((message) => revealMessage(message, tokenToValue));
}

function revealMessage(
  message: Message,
  tokenToValue: ReadonlyMap<string, string>,
): Message {
  const base = {
    id: message.id,
    threadId: message.threadId,
    createdAt: message.createdAt,
  };
  if (message instanceof UserMessage) {
    return new UserMessage({
      ...base,
      content: message.content.map((c) => revealContent(c, tokenToValue)),
    });
  }
  if (message instanceof AssistantMessage) {
    return new AssistantMessage({
      ...base,
      content: message.content.map((c) => revealContent(c, tokenToValue)),
    });
  }
  if (message instanceof SystemMessage) {
    return new SystemMessage({
      ...base,
      content: message.content.map((c) => revealContent(c, tokenToValue)),
    });
  }
  if (message instanceof ToolResultMessage) {
    return new ToolResultMessage({
      ...base,
      content: message.content.map((c) => revealContent(c, tokenToValue)),
    });
  }
  return message;
}

function revealContent<T extends MessageContent>(
  content: T,
  tokenToValue: ReadonlyMap<string, string>,
): T {
  if (content instanceof TextMessageContent) {
    return new TextMessageContent(
      deanonymizeText(content.text, tokenToValue),
      content.providerMetadata,
      content.isSkillInstruction,
    ) as MessageContent as T;
  }
  if (content instanceof ToolResultMessageContent) {
    return new ToolResultMessageContent(
      content.toolId,
      content.toolName,
      deanonymizeText(content.result, tokenToValue),
    ) as MessageContent as T;
  }
  if (content instanceof ToolUseMessageContent) {
    return new ToolUseMessageContent(
      content.id,
      content.name,
      revealValue(content.params, tokenToValue) as Record<string, unknown>,
      content.providerMetadata,
      content.integration,
      content.stream,
    ) as MessageContent as T;
  }
  return content;
}

function revealValue(
  value: unknown,
  tokenToValue: ReadonlyMap<string, string>,
): unknown {
  if (typeof value === 'string') return deanonymizeText(value, tokenToValue);
  if (Array.isArray(value)) {
    return value.map((item) => revealValue(item, tokenToValue));
  }
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [
        key,
        revealValue(entry, tokenToValue),
      ]),
    );
  }
  return value;
}
