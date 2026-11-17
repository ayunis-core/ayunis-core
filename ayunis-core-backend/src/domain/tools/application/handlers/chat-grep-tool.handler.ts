import { Injectable, Logger } from '@nestjs/common';
import type { PastMessageMatch } from 'src/domain/threads/application/models/past-message-match';
import {
  InvalidPastMessagePatternError,
  PastMessageSearchTimeoutError,
} from 'src/domain/threads/application/threads.errors';
import { GrepPastMessagesQuery } from 'src/domain/threads/application/use-cases/grep-past-messages/grep-past-messages.query';
import { GrepPastMessagesUseCase } from 'src/domain/threads/application/use-cases/grep-past-messages/grep-past-messages.use-case';
import {
  ToolExecutionContext,
  ToolExecutionHandler,
} from 'src/domain/tools/application/ports/execution.handler';
import { ToolExecutionFailedError } from 'src/domain/tools/application/tools.errors';
import {
  CHAT_GREP_MAX_MATCHES,
  ChatGrepTool,
} from 'src/domain/tools/domain/tools/chat-grep-tool.entity';
import { toUtcDayRange } from 'src/domain/tools/domain/tools/past-chat-dates';

const TIMEOUT_RESULT =
  'The search took too long. Try a narrower pattern or a shorter time range with from and to.';

@Injectable()
export class ChatGrepToolHandler extends ToolExecutionHandler {
  private readonly logger = new Logger(ChatGrepToolHandler.name);

  constructor(
    private readonly grepPastMessagesUseCase: GrepPastMessagesUseCase,
  ) {
    super();
  }

  async execute(params: {
    tool: ChatGrepTool;
    input: Record<string, unknown>;
    context: ToolExecutionContext;
  }): Promise<string> {
    const { tool, input } = params;
    const { pattern, from, to } = validateInput(tool, input);
    this.logger.log({ from, to }, 'execute');

    const matches = await this.grep(tool, pattern, from, to);
    if (typeof matches === 'string') return matches;
    if (matches.length === 0) {
      return 'No message in the earlier chats matches this pattern.';
    }
    return JSON.stringify({
      matches: matches.slice(0, CHAT_GREP_MAX_MATCHES).map((match) => ({
        threadId: match.threadId,
        title: match.threadTitle,
        messageNumber: match.messageNumber,
        role: match.role,
        createdAt: match.createdAt.toISOString(),
        excerpt: match.excerpt,
      })),
      moreMatches: matches.length > CHAT_GREP_MAX_MATCHES,
    });
  }

  /** The matches, or the result telling the model how to fix its search. */
  private async grep(
    tool: ChatGrepTool,
    pattern: string,
    from?: string,
    to?: string,
  ): Promise<PastMessageMatch[] | string> {
    try {
      return await this.grepPastMessagesUseCase.execute(
        new GrepPastMessagesQuery({
          scope: tool.scope,
          pattern,
          created: toUtcDayRange(from, to),
          // One more than shown, to tell the model whether more messages match.
          limit: CHAT_GREP_MAX_MATCHES + 1,
        }),
      );
    } catch (error) {
      if (error instanceof InvalidPastMessagePatternError) {
        return `The pattern is not a valid PostgreSQL regular expression: ${error.reason}. Correct it and search again.`;
      }
      if (error instanceof PastMessageSearchTimeoutError) return TIMEOUT_RESULT;
      throw error;
    }
  }
}

// A schema violation must reach the model so it can correct the call;
// ExecuteToolUseCase hides raw errors from it.
function validateInput(
  tool: ChatGrepTool,
  input: Record<string, unknown>,
): ReturnType<ChatGrepTool['validateParams']> {
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
