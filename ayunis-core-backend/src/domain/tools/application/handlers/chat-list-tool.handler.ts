import { Injectable, Logger } from '@nestjs/common';
import { FindPastChatsQuery } from 'src/domain/threads/application/use-cases/find-past-chats/find-past-chats.query';
import { FindPastChatsUseCase } from 'src/domain/threads/application/use-cases/find-past-chats/find-past-chats.use-case';
import type { PastChatActivityRange } from 'src/domain/threads/domain/past-chat-scope';
import {
  ToolExecutionContext,
  ToolExecutionHandler,
} from 'src/domain/tools/application/ports/execution.handler';
import { ToolExecutionFailedError } from 'src/domain/tools/application/tools.errors';
import {
  CHAT_LIST_PAGE_SIZE,
  ChatListTool,
} from 'src/domain/tools/domain/tools/chat-list-tool.entity';

const DAY_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class ChatListToolHandler extends ToolExecutionHandler {
  private readonly logger = new Logger(ChatListToolHandler.name);

  constructor(private readonly findPastChatsUseCase: FindPastChatsUseCase) {
    super();
  }

  async execute(params: {
    tool: ChatListTool;
    input: Record<string, unknown>;
    context: ToolExecutionContext;
  }): Promise<string> {
    const { tool, input } = params;
    const { page = 1, from, to } = validateInput(tool, input);
    this.logger.log({ page, from, to }, 'execute');

    const result = await this.findPastChatsUseCase.execute(
      new FindPastChatsQuery({
        scope: tool.scope,
        activity: toActivityRange(from, to),
        limit: CHAT_LIST_PAGE_SIZE,
        offset: (page - 1) * CHAT_LIST_PAGE_SIZE,
      }),
    );
    const totalChats = result.total ?? result.data.length;
    return JSON.stringify({
      page,
      totalPages: Math.ceil(totalChats / CHAT_LIST_PAGE_SIZE),
      totalChats,
      chats: result.data.map((thread) => ({
        threadId: thread.id,
        title: thread.title ?? null,
        createdAt: thread.createdAt.toISOString(),
        lastActivityAt: thread.lastActivityAt.toISOString(),
      })),
    });
  }
}

// A schema violation must reach the model so it can correct the call;
// ExecuteToolUseCase hides raw errors from it.
function validateInput(
  tool: ChatListTool,
  input: Record<string, unknown>,
): ReturnType<ChatListTool['validateParams']> {
  try {
    return tool.validateParams(input);
  } catch (error) {
    throw new ToolExecutionFailedError({
      toolName: tool.name,
      exposeToLLM: true,
      message: error instanceof Error ? error.message : 'Invalid input',
    });
  }
}

/** Whole UTC days: `to` includes its day. */
function toActivityRange(from?: string, to?: string): PastChatActivityRange {
  return {
    ...(from && { from: new Date(`${from}T00:00:00.000Z`) }),
    ...(to && {
      before: new Date(new Date(`${to}T00:00:00.000Z`).getTime() + DAY_MS),
    }),
  };
}
