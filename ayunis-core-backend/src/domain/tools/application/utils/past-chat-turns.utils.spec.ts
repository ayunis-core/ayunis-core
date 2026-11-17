import { randomUUID } from 'crypto';
import type { Message } from 'src/domain/messages/domain/message.entity';
import { TextMessageContent } from 'src/domain/messages/domain/message-contents/text-message-content.entity';
import { ThinkingMessageContent } from 'src/domain/messages/domain/message-contents/thinking-message-content.entity';
import { ToolResultMessageContent } from 'src/domain/messages/domain/message-contents/tool-result.message-content.entity';
import { ToolUseMessageContent } from 'src/domain/messages/domain/message-contents/tool-use.message-content.entity';
import { AssistantMessage } from 'src/domain/messages/domain/messages/assistant-message.entity';
import { SystemMessage } from 'src/domain/messages/domain/messages/system-message.entity';
import { ToolResultMessage } from 'src/domain/messages/domain/messages/tool-result-message.entity';
import { UserMessage } from 'src/domain/messages/domain/messages/user-message.entity';
import {
  PAST_CHAT_MESSAGE_MAX_LENGTH,
  readPastChatTurns,
} from './past-chat-turns.utils';

const threadId = randomUUID();

const user = (text: string) =>
  new UserMessage({ threadId, content: [new TextMessageContent(text)] });
const assistant = (text: string) =>
  new AssistantMessage({ threadId, content: [new TextMessageContent(text)] });
const toolCall = () =>
  new AssistantMessage({
    threadId,
    content: [
      new ThinkingMessageContent('Ich suche die Satzung.'),
      new ToolUseMessageContent('call-1', 'internet_search', { query: 'x' }),
    ],
  });
const toolResult = () =>
  new ToolResultMessage({
    threadId,
    content: [
      new ToolResultMessageContent('call-1', 'internet_search', 'Treffer'),
    ],
  });

/** Turn 1: #1–#4, turn 2: #5–#6, turn 3: #7–#8. */
const chat: Message[] = [
  user('Wie hoch ist die Hundesteuer?'),
  toolCall(),
  toolResult(),
  assistant('120 Euro im Jahr.'),
  user('Und für einen zweiten Hund?'),
  assistant('180 Euro.'),
  user('Danke.'),
  assistant('Gern.'),
];

const numbers = (messages: Message[], start: number, turns: number) =>
  readPastChatTurns(messages, start, turns).messages.map(
    (message) => message.number,
  );

describe('readPastChatTurns', () => {
  it('returns whole turns with chat-wide numbers and the next turn’s first message', () => {
    expect(readPastChatTurns(chat, 1, 2)).toEqual({
      messages: [
        expect.objectContaining({
          number: 1,
          role: 'user',
          text: 'Wie hoch ist die Hundesteuer?',
        }),
        expect.objectContaining({
          number: 4,
          role: 'assistant',
          text: '120 Euro im Jahr.',
        }),
        expect.objectContaining({ number: 5, role: 'user' }),
        expect.objectContaining({ number: 6, role: 'assistant' }),
      ],
      nextMessageNumber: 7,
    });
  });

  it('starts at the beginning of the turn containing the requested message', () => {
    expect(numbers(chat, 3, 1)).toEqual([1, 4]);
    expect(numbers(chat, 6, 1)).toEqual([5, 6]);
  });

  it('pages through the chat with nextMessageNumber without gaps or overlaps', () => {
    const seen: number[] = [];
    let next: number | null = 1;
    while (next !== null) {
      const page = readPastChatTurns(chat, next, 1);
      seen.push(...page.messages.map((message) => message.number));
      next = page.nextMessageNumber;
    }

    expect(seen).toEqual([1, 4, 5, 6, 7, 8]);
  });

  it('ends without a next message when the turns run past the end', () => {
    expect(readPastChatTurns(chat, 5, 10).nextMessageNumber).toBeNull();
  });

  it('counts messages before the first user message as part of the first turn', () => {
    const messages = [
      new SystemMessage({
        threadId,
        content: [new TextMessageContent('Systemhinweis')],
      }),
      assistant('Willkommen.'),
      user('Hallo'),
      assistant('Hallo!'),
    ];

    expect(readPastChatTurns(messages, 1, 1)).toEqual({
      messages: [expect.objectContaining({ number: 2, text: 'Willkommen.' })],
      nextMessageNumber: 3,
    });
  });

  it('leaves out skill instructions and nudges but keeps the user’s own text', () => {
    const messages = [
      new UserMessage({
        threadId,
        content: [
          new TextMessageContent('Folge dem Leitfaden.', null, true),
          new TextMessageContent('Prüfe den Antrag.'),
          new TextMessageContent('Bitte antworte.', null, false, true),
        ],
      }),
    ];

    expect(readPastChatTurns(messages, 1, 1).messages).toEqual([
      expect.objectContaining({ text: 'Prüfe den Antrag.' }),
    ]);
  });

  it('truncates very long messages and says how much is missing', () => {
    const long = 'a'.repeat(PAST_CHAT_MESSAGE_MAX_LENGTH + 25);

    const [message] = readPastChatTurns([user(long)], 1, 1).messages;

    expect(message.text).toBe(
      `${'a'.repeat(PAST_CHAT_MESSAGE_MAX_LENGTH)} […25 more characters]`,
    );
  });

  it('reads an empty chat as no messages', () => {
    expect(readPastChatTurns([], 1, 3)).toEqual({
      messages: [],
      nextMessageNumber: null,
    });
  });
});
