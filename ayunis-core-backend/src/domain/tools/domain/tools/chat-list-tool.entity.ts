import type { FromSchema, JSONSchema } from 'json-schema-to-ts';
import { validateToolParams } from 'src/common/validators/tool-params.validator';
import type { PastChatScope } from 'src/domain/threads/domain/past-chat-scope';
import { Tool } from 'src/domain/tools/domain/tool.entity';
import { ToolType } from 'src/domain/tools/domain/value-objects/tool-type.enum';
import { UTC_DATE_PATTERN, assertUtcDateRange } from './past-chat-dates';

export const CHAT_LIST_PAGE_SIZE = 10;

const chatListToolParameters = {
  type: 'object' as const,
  properties: {
    page: {
      type: 'integer' as const,
      description: `Page of the list, ${CHAT_LIST_PAGE_SIZE} chats per page. Defaults to 1.`,
      minimum: 1,
      default: 1,
    },
    from: {
      type: 'string' as const,
      description:
        'Only chats with a message on or after this UTC date (YYYY-MM-DD).',
      pattern: UTC_DATE_PATTERN,
    },
    to: {
      type: 'string' as const,
      description:
        'Only chats with a message on or before this UTC date (YYYY-MM-DD).',
      pattern: UTC_DATE_PATTERN,
    },
  },
  additionalProperties: false,
} as const satisfies JSONSchema;

type ChatListToolParameters = FromSchema<typeof chatListToolParameters>;

/** Lists the user's past chats in the run's scope, most recent activity first. */
export class ChatListTool extends Tool {
  constructor(public readonly scope: PastChatScope) {
    super({
      name: ToolType.CHAT_LIST,
      description: `List the user's earlier chats, ${CHAT_LIST_PAGE_SIZE} per page, most recently active first, with ID, title, creation date and last activity (UTC).`,
      parameters: chatListToolParameters,
      type: ToolType.CHAT_LIST,
    });
  }

  validateParams(params: Record<string, unknown>): ChatListToolParameters {
    const validated = validateToolParams<ChatListToolParameters>(
      this.parameters,
      params,
    );
    assertUtcDateRange(validated.from, validated.to);
    return validated;
  }

  // The user's own chats, read back into their own conversation.
  get returnsPii(): boolean {
    return true;
  }
}
