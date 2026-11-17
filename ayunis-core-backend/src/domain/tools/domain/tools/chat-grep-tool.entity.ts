import type { FromSchema, JSONSchema } from 'json-schema-to-ts';
import { validateToolParams } from 'src/common/validators/tool-params.validator';
import type { PastChatScope } from 'src/domain/threads/domain/past-chat-scope';
import { Tool } from 'src/domain/tools/domain/tool.entity';
import { ToolType } from 'src/domain/tools/domain/value-objects/tool-type.enum';
import { UTC_DATE_PATTERN, assertUtcDateRange } from './past-chat-dates';

export const CHAT_GREP_MAX_MATCHES = 10;
export const CHAT_GREP_PATTERN_MAX_LENGTH = 200;

const chatGrepToolParameters = {
  type: 'object' as const,
  properties: {
    pattern: {
      type: 'string' as const,
      description: `PostgreSQL regular expression, matched case-insensitively, at most ${CHAT_GREP_PATTERN_MAX_LENGTH} characters.`,
      minLength: 1,
      maxLength: CHAT_GREP_PATTERN_MAX_LENGTH,
    },
    from: {
      type: 'string' as const,
      description:
        'Only messages written on or after this UTC date (YYYY-MM-DD).',
      pattern: UTC_DATE_PATTERN,
    },
    to: {
      type: 'string' as const,
      description:
        'Only messages written on or before this UTC date (YYYY-MM-DD).',
      pattern: UTC_DATE_PATTERN,
    },
  },
  required: ['pattern'],
  additionalProperties: false,
} as const satisfies JSONSchema;

type ChatGrepToolParameters = FromSchema<typeof chatGrepToolParameters>;

const CHAT_GREP_DESCRIPTION = [
  `Search the user's and your messages in the user's earlier chats with a regular expression. Returns up to ${CHAT_GREP_MAX_MATCHES} matching messages, newest first, each with the chat's ID and title, the message number, role, time (UTC) and an excerpt around the first match. To read more around a match, call chat_read with its threadId and messageNumber. When moreMatches is true, more messages match than were returned: make the pattern more specific or narrow from and to.`,
  "The pattern is a PostgreSQL regular expression matched case-insensitively. It matches anywhere in the text, so 'antrag' also finds 'Bauantrag'. Cover word forms in one pattern, e.g. 'antr(a|ä)ge?' finds 'Antrag' and 'Anträge'. A word boundary is \\y, not \\b (which means backspace in PostgreSQL); \\m and \\M mark the start and end of a word, so '\\mantrag\\M' finds the word 'Antrag' but not 'Bauantrag'.",
  'Only the text of messages is searched, not tool calls or tool results.',
].join(' ');

/** Greps the user's past messages in the run's scope, newest first. */
export class ChatGrepTool extends Tool {
  constructor(public readonly scope: PastChatScope) {
    super({
      name: ToolType.CHAT_GREP,
      description: CHAT_GREP_DESCRIPTION,
      parameters: chatGrepToolParameters,
      type: ToolType.CHAT_GREP,
    });
  }

  validateParams(params: Record<string, unknown>): ChatGrepToolParameters {
    const validated = validateToolParams<ChatGrepToolParameters>(
      this.parameters,
      params,
    );
    assertUtcDateRange(validated.from, validated.to);
    return validated;
  }

  get returnsPii(): boolean {
    return true;
  }
}
