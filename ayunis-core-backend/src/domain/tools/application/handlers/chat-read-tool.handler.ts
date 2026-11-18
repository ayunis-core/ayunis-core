import { Injectable, Logger } from '@nestjs/common';
import type { UUID } from 'crypto';
import { ThreadNotFoundError } from 'src/domain/threads/application/threads.errors';
import { FindPastChatQuery } from 'src/domain/threads/application/use-cases/find-past-chat/find-past-chat.query';
import { FindPastChatUseCase } from 'src/domain/threads/application/use-cases/find-past-chat/find-past-chat.use-case';
import type { Thread } from 'src/domain/threads/domain/thread.entity';
import {
  ToolExecutionContext,
  ToolExecutionHandler,
} from 'src/domain/tools/application/ports/execution.handler';
import { ToolExecutionFailedError } from 'src/domain/tools/application/tools.errors';
import { readPastChatTurns } from 'src/domain/tools/application/utils/past-chat-turns.utils';
import {
  CHAT_READ_DEFAULT_TURNS,
  ChatReadTool,
} from 'src/domain/tools/domain/tools/chat-read-tool.entity';

@Injectable()
export class ChatReadToolHandler extends ToolExecutionHandler {
  private readonly logger = new Logger(ChatReadToolHandler.name);

  constructor(private readonly findPastChatUseCase: FindPastChatUseCase) {
    super();
  }

  async execute(params: {
    tool: ChatReadTool;
    input: Record<string, unknown>;
    context: ToolExecutionContext;
  }): Promise<string> {
    const { tool, input } = params;
    const {
      threadId,
      messageNumber = 1,
      turns = CHAT_READ_DEFAULT_TURNS,
    } = validateInput(tool, input);
    this.logger.log({ threadId, messageNumber, turns }, 'execute');

    const thread = await this.findThread(tool, threadId as UUID);
    // Out of scope looks exactly like missing, so nothing tells them apart.
    if (!thread) return `No chat with ID ${threadId} was found.`;

    const totalMessages = thread.messages.length;
    if (totalMessages > 0 && messageNumber > totalMessages) {
      throw new ToolExecutionFailedError({
        toolName: tool.name,
        exposeToLLM: true,
        message: `messageNumber ${messageNumber} is past the end of this chat, which has ${totalMessages} messages.`,
      });
    }
    return JSON.stringify({
      threadId: thread.id,
      title: thread.title ?? null,
      totalMessages,
      ...readPastChatTurns(thread.messages, messageNumber, turns),
    });
  }

  private async findThread(
    tool: ChatReadTool,
    threadId: UUID,
  ): Promise<Thread | null> {
    try {
      return await this.findPastChatUseCase.execute(
        new FindPastChatQuery(tool.scope, threadId),
      );
    } catch (error) {
      if (error instanceof ThreadNotFoundError) return null;
      throw error;
    }
  }
}

// A schema violation must reach the model so it can correct the call;
// ExecuteToolUseCase hides raw errors from it.
function validateInput(
  tool: ChatReadTool,
  input: Record<string, unknown>,
): ReturnType<ChatReadTool['validateParams']> {
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
