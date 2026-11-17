import type { Message } from 'src/domain/messages/domain/message.entity';
import { TextMessageContent } from 'src/domain/messages/domain/message-contents/text-message-content.entity';
import { MessageRole } from 'src/domain/messages/domain/value-objects/message-role.object';

export const PAST_CHAT_MESSAGE_MAX_LENGTH = 4_000;

export interface PastChatMessage {
  /** Position in the whole chat, starting at 1. */
  number: number;
  role: MessageRole.USER | MessageRole.ASSISTANT;
  createdAt: string;
  text: string;
}

export interface PastChatTurns {
  messages: PastChatMessage[];
  /** First message of the turn after the last one returned; null at the end. */
  nextMessageNumber: number | null;
}

/**
 * Reads `turns` whole turns, starting with the one that contains message
 * `messageNumber`. A turn is a user message and everything up to the next
 * one; anything before the first user message belongs to the first turn.
 * Numbers count every message of the chat, so they stay the same whatever is
 * left out of the result: tool calls and results, thinking, system messages,
 * skill instructions and nudges.
 */
export function readPastChatTurns(
  messages: readonly Message[],
  messageNumber: number,
  turns: number,
): PastChatTurns {
  const starts = turnStarts(messages);
  const turn = starts.findLastIndex((start) => start < messageNumber);
  const from = starts[turn];
  const end = starts.at(turn + turns) ?? messages.length;
  return {
    messages: messages
      .slice(from, end)
      .flatMap((message, offset) => visibleMessage(message, from + offset + 1)),
    nextMessageNumber: end < messages.length ? end + 1 : null,
  };
}

function turnStarts(messages: readonly Message[]): number[] {
  const starts = messages.flatMap((message, index) =>
    index > 0 && message.role === MessageRole.USER ? [index] : [],
  );
  return [0, ...starts];
}

function visibleMessage(message: Message, number: number): PastChatMessage[] {
  if (
    message.role !== MessageRole.USER &&
    message.role !== MessageRole.ASSISTANT
  ) {
    return [];
  }
  const text = message.content
    .filter(
      (content): content is TextMessageContent =>
        content instanceof TextMessageContent &&
        !content.isSkillInstruction &&
        !content.isNudge,
    )
    .map((content) => content.text)
    .join('\n\n')
    .trim();
  if (!text) return [];
  return [
    {
      number,
      role: message.role,
      createdAt: message.createdAt.toISOString(),
      text: truncate(text),
    },
  ];
}

function truncate(text: string): string {
  if (text.length <= PAST_CHAT_MESSAGE_MAX_LENGTH) return text;
  const omitted = text.length - PAST_CHAT_MESSAGE_MAX_LENGTH;
  return `${text.slice(0, PAST_CHAT_MESSAGE_MAX_LENGTH)} […${omitted} more characters]`;
}
