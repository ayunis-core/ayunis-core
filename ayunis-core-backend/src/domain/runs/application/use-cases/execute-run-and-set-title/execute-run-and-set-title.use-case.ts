import { Injectable, Logger } from '@nestjs/common';
import { ExecuteRunAndSetTitleCommand } from './execute-run-and-set-title.command';
import { ExecuteRunUseCase } from '../execute-run/execute-run.use-case';
import { ExecuteRunCommand } from '../execute-run/execute-run.command';
import { FindThreadUseCase } from '../../../../threads/application/use-cases/find-thread/find-thread.use-case';
import { FindThreadQuery } from '../../../../threads/application/use-cases/find-thread/find-thread.query';
import { GenerateAndSetThreadTitleUseCase } from '../../../../threads/application/use-cases/generate-and-set-thread-title/generate-and-set-thread-title.use-case';
import { GenerateAndSetThreadTitleCommand } from '../../../../threads/application/use-cases/generate-and-set-thread-title/generate-and-set-thread-title.command';
import {
  RunEvent,
  RunMasksEvent,
  RunMessageEvent,
  RunThreadEvent,
  RunErrorEvent,
  RunSessionEvent,
} from '../../run-events';
import { RunPiiMasksUpdate } from '../../../domain/run-pii-masks-update.entity';
import type { Message } from 'src/domain/messages/domain/message.entity';
import {
  RunInput,
  RunUserInput,
} from 'src/domain/runs/domain/run-input.entity';
import { RunNoModelFoundError } from '../../runs.errors';
import { Thread } from '../../../../threads/domain/thread.entity';
import { AnonymizeTextForOrgUseCase } from 'src/domain/anonymization-settings/application/use-cases/anonymize-text-for-org/anonymize-text-for-org.use-case';
import { AnonymizeTextForOrgCommand } from 'src/domain/anonymization-settings/application/use-cases/anonymize-text-for-org/anonymize-text-for-org.command';
import { ApplicationError } from 'src/common/errors/base.error';
import { ContextService } from 'src/common/context/services/context.service';
import { RunAnonymizationUnavailableError } from '../../runs.errors';

@Injectable()
export class ExecuteRunAndSetTitleUseCase {
  private readonly logger = new Logger(ExecuteRunAndSetTitleUseCase.name);

  constructor(
    private readonly executeRunUseCase: ExecuteRunUseCase,
    private readonly findThreadUseCase: FindThreadUseCase,
    private readonly generateAndSetThreadTitleUseCase: GenerateAndSetThreadTitleUseCase,
    private readonly anonymizeTextForOrgUseCase: AnonymizeTextForOrgUseCase,
    private readonly contextService: ContextService,
  ) {}

  async *execute(
    command: ExecuteRunAndSetTitleCommand,
  ): AsyncGenerator<RunEvent> {
    try {
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

      // Execute the run and stream messages. Tier-aware fair-use + credit
      // budget gates are enforced inside `ExecuteRunUseCase` after the model
      // is resolved — see the call to `checkQuotaUseCase.execute` there.
      const messageGenerator = await this.executeRunUseCase.execute(
        new ExecuteRunCommand({
          threadId: command.threadId,
          input: command.input,
          streaming: command.streaming,
        }),
      );

      for await (const item of messageGenerator) {
        yield this.toStreamEvent(item, command.threadId);
      }
      if (shouldGenerateTitle) {
        const titleEvent = await this.generateTitle(command, thread);
        if (titleEvent) {
          yield titleEvent;
        }
      }
    } catch (error) {
      this.logger.error('Error in executeRunAndSetTitle', error);

      // Preserve error code from domain errors (e.g., RUN_NO_MODEL_FOUND,
      // QUOTA_EXCEEDED) so the SSE consumer can branch on it. The metadata
      // spread below also forwards `retryAfterSeconds` for QuotaExceededError.
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

  private toStreamEvent(
    item: Message | RunPiiMasksUpdate,
    threadId: string,
  ): RunMasksEvent | RunMessageEvent {
    if (item instanceof RunPiiMasksUpdate) {
      return {
        type: 'masks',
        threadId,
        masks: item.masks.map((mask) => ({
          token: mask.token,
          value: mask.value,
          category: mask.category,
        })),
        timestamp: new Date().toISOString(),
      };
    }
    return {
      type: 'message',
      message: item,
      threadId,
      timestamp: new Date().toISOString(),
    };
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

      const model = thread.model;
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

  // Throws when anonymization is unavailable: generateTitle's catch then
  // skips the title instead of sending raw PII to the model.
  private async anonymizeText(text: string): Promise<string> {
    const orgId = this.contextService.get('orgId');
    if (!orgId) {
      throw new RunAnonymizationUnavailableError({
        originalError: 'No org context available for anonymization',
      });
    }

    const result = await this.anonymizeTextForOrgUseCase.execute(
      new AnonymizeTextForOrgCommand(text, orgId),
    );
    if (result.replacements.length > 0) {
      this.logger.log('Anonymized text for title generation', {
        originalLength: text.length,
        anonymizedLength: result.anonymizedText.length,
        replacementsCount: result.replacements.length,
      });
    }
    return result.anonymizedText;
  }
}
