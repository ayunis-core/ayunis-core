import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ExecuteRunAndSetTitleCommand } from './execute-run-and-set-title.command';
import { ExecuteRunUseCase } from '../execute-run/execute-run.use-case';
import { ExecuteRunCommand } from '../execute-run/execute-run.command';
import { FindThreadUseCase } from '../../../../threads/application/use-cases/find-thread/find-thread.use-case';
import { FindThreadQuery } from '../../../../threads/application/use-cases/find-thread/find-thread.query';
import { GenerateAndSetThreadTitleUseCase } from '../../../../threads/application/use-cases/generate-and-set-thread-title/generate-and-set-thread-title.use-case';
import { GenerateAndSetThreadTitleCommand } from '../../../../threads/application/use-cases/generate-and-set-thread-title/generate-and-set-thread-title.command';
import {
  RunEvent,
  RunMessageEvent,
  RunThreadEvent,
  RunErrorEvent,
  RunSessionEvent,
} from '../../run-events';
import {
  RunInput,
  RunUserInput,
} from 'src/domain/runs/domain/run-input.entity';
import { RunNoModelFoundError } from '../../runs.errors';
import { Thread } from '../../../../threads/domain/thread.entity';
import { FindOneAgentUseCase } from 'src/domain/agents/application/use-cases/find-one-agent/find-one-agent.use-case';
import { FindOneAgentQuery } from 'src/domain/agents/application/use-cases/find-one-agent/find-one-agent.query';
import { Agent } from 'src/domain/agents/domain/agent.entity';
import { AnonymizeTextUseCase } from 'src/common/anonymization/application/use-cases/anonymize-text/anonymize-text.use-case';
import { AnonymizeTextCommand } from 'src/common/anonymization/application/use-cases/anonymize-text/anonymize-text.command';
import { ApplicationError } from 'src/common/errors/base.error';
import { ContextService } from 'src/common/context/services/context.service';
import { CheckQuotaUseCase } from 'src/iam/quotas/application/use-cases/check-quota/check-quota.use-case';
import { CheckQuotaQuery } from 'src/iam/quotas/application/use-cases/check-quota/check-quota.query';
import { QuotaType } from 'src/iam/quotas/domain/quota-type.enum';

@Injectable()
export class ExecuteRunAndSetTitleUseCase {
  private readonly logger = new Logger(ExecuteRunAndSetTitleUseCase.name);

  constructor(
    private readonly executeRunUseCase: ExecuteRunUseCase,
    private readonly findThreadUseCase: FindThreadUseCase,
    private readonly findOneAgentUseCase: FindOneAgentUseCase,
    private readonly generateAndSetThreadTitleUseCase: GenerateAndSetThreadTitleUseCase,
    private readonly anonymizeTextUseCase: AnonymizeTextUseCase,
    private readonly contextService: ContextService,
    private readonly checkQuotaUseCase: CheckQuotaUseCase,
  ) {}

  async *execute(
    command: ExecuteRunAndSetTitleCommand,
  ): AsyncGenerator<RunEvent> {
    try {
      // Fair use quota check - throws QuotaExceededError if limit exceeded
      const userId = this.contextService.get('userId');
      if (!userId) {
        throw new UnauthorizedException('User not authenticated');
      }
      await this.checkQuotaUseCase.execute(
        new CheckQuotaQuery(userId, QuotaType.FAIR_USE_MESSAGES),
      );

      const streamingStartEvent: RunSessionEvent = {
        type: 'session',
        streaming: true,
        threadId: command.threadId,
        timestamp: new Date().toISOString(),
      };
      yield streamingStartEvent;

      const { thread } = await this.findThreadUseCase.execute(
        new FindThreadQuery(command.threadId),
      );

      // If thread has no messages, we should generate a title after the first message
      const shouldGenerateTitle = thread.messages.length === 0;

      // Execute the run and stream messages
      const messageGenerator = await this.executeRunUseCase.execute(
        new ExecuteRunCommand({
          threadId: command.threadId,
          input: command.input,
          streaming: command.streaming,
        }),
      );

      for await (const message of messageGenerator) {
        // Yield message event with domain entity
        const messageEvent: RunMessageEvent = {
          type: 'message',
          message,
          threadId: command.threadId,
          timestamp: new Date().toISOString(),
        };
        yield messageEvent;
      }
      if (shouldGenerateTitle) {
        const titleEvent = await this.generateTitle(command, thread);
        if (titleEvent) {
          yield titleEvent;
        }
      }
    } catch (error) {
      this.logger.error('Error in executeRunAndSetTitle', error);

      // Preserve error code from domain errors (e.g., RUN_NO_MODEL_FOUND)
      const errorCode =
        error instanceof ApplicationError ? error.code : 'EXECUTION_ERROR';

      // Yield error event
      const errorEvent: RunErrorEvent = {
        type: 'error',
        message:
          error instanceof Error
            ? error.message
            : 'An error occurred while executing the run',
        threadId: command.threadId,
        timestamp: new Date().toISOString(),
        code: errorCode,
        details: {
          error: error instanceof Error ? error.toString() : 'Unknown error',
          stack: error instanceof Error ? error.stack : 'Unknown error',
          // Include metadata from ApplicationError (e.g., retryAfterSeconds for quota errors)
          ...(error instanceof ApplicationError && error.metadata),
        },
      };

      yield errorEvent;
    } finally {
      const streamingEndEvent: RunSessionEvent = {
        type: 'session',
        streaming: false,
        threadId: command.threadId,
        timestamp: new Date().toISOString(),
      };
      yield streamingEndEvent;
    }
  }

  private async generateTitle(
    command: ExecuteRunAndSetTitleCommand,
    thread: Thread,
  ): Promise<RunThreadEvent | null> {
    try {
      // Extract the first user message for title generation
      const firstUserMessage = this.extractUserMessage(command.input);

      if (!firstUserMessage) {
        return null;
      }

      // Anonymize the message if thread is in privacy mode
      const messageForTitle = thread.isAnonymous
        ? await this.anonymizeText(firstUserMessage)
        : firstUserMessage;

      this.logger.log('Generating thread title', {
        threadId: command.threadId,
        isAnonymous: thread.isAnonymous,
      });

      // Fetch agent if thread has agentId
      let agent: Agent | undefined;
      if (thread.agentId) {
        agent = (
          await this.findOneAgentUseCase.execute(
            new FindOneAgentQuery(thread.agentId),
          )
        ).agent;
      }

      const model = thread.model ?? agent?.model;
      if (!model) {
        throw new RunNoModelFoundError({
          threadId: command.threadId,
        });
      }

      const title = await this.generateAndSetThreadTitleUseCase.execute(
        new GenerateAndSetThreadTitleCommand({
          thread,
          model: model.model,
          message: messageForTitle,
        }),
      );

      if (title) {
        return {
          type: 'thread',
          threadId: thread.id,
          updateType: 'title_updated',
          title: title,
          timestamp: new Date().toISOString(),
        };
      }

      return null;
    } catch (error) {
      this.logger.warn('Error in generateTitle', {
        threadId: command.threadId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return null;
    }
  }

  private extractUserMessage(input: RunInput): string | undefined {
    if (input instanceof RunUserInput) {
      return input.text;
    }
    return undefined;
  }

  private async anonymizeText(text: string): Promise<string> {
    try {
      const result = await this.anonymizeTextUseCase.execute(
        new AnonymizeTextCommand(text, 'de'),
      );
      if (result.replacements.length > 0) {
        this.logger.log('Anonymized text for title generation', {
          originalLength: text.length,
          anonymizedLength: result.anonymizedText.length,
          replacementsCount: result.replacements.length,
        });
      }
      return result.anonymizedText;
    } catch (error) {
      this.logger.error('Failed to anonymize text, returning original', {
        error: error as Error,
      });
      return text;
    }
  }
}
