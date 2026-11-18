import type { FromSchema, JSONSchema } from 'json-schema-to-ts';
import { validateToolParams } from 'src/common/validators/tool-params.validator';
import type { PastChatScope } from 'src/domain/threads/domain/past-chat-scope';
import { Tool } from 'src/domain/tools/domain/tool.entity';
import { ToolType } from 'src/domain/tools/domain/value-objects/tool-type.enum';

export const CHAT_READ_MAX_TURNS = 10;
export const CHAT_READ_DEFAULT_TURNS = 3;

const chatReadToolParameters = {
  type: 'object' as const,
  properties: {
    threadId: {
      type: 'string' as const,
      format: 'uuid' as const,
      description: 'ID of the chat, as returned by chat_list.',
    },
    messageNumber: {
      type: 'integer' as const,
      description:
        'Start at the turn that contains this message (1 is the first message). Pass nextMessageNumber from the previous result to continue. Defaults to 1.',
      minimum: 1,
      default: 1,
    },
    turns: {
      type: 'integer' as const,
      description: `How many turns to read: a turn is one user message and the replies to it. Between 1 and ${CHAT_READ_MAX_TURNS}, defaults to ${CHAT_READ_DEFAULT_TURNS}.`,
      minimum: 1,
      maximum: CHAT_READ_MAX_TURNS,
      default: CHAT_READ_DEFAULT_TURNS,
    },
  },
  required: ['threadId'],
  additionalProperties: false,
} as const satisfies JSONSchema;

type ChatReadToolParameters = FromSchema<typeof chatReadToolParameters>;

/** Reads whole turns of one of the user's past chats in the run's scope. */
export class ChatReadTool extends Tool {
  constructor(public readonly scope: PastChatScope) {
    super({
      name: ToolType.CHAT_READ,
      description:
        "Read the user's and the assistant's messages of one earlier chat, a few whole turns at a time.",
      parameters: chatReadToolParameters,
      type: ToolType.CHAT_READ,
    });
  }

  validateParams(params: Record<string, unknown>): ChatReadToolParameters {
    return validateToolParams<ChatReadToolParameters>(this.parameters, params);
  }

  get returnsPii(): boolean {
    return true;
  }
}
