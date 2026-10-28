import { Injectable, Logger } from '@nestjs/common';
import type { UUID } from 'crypto';
import { ExecuteRunAndSetTitleCommand } from './execute-run-and-set-title.command';
import { ExecuteRunUseCase } from 'src/domain/runs/application/use-cases/execute-run/execute-run.use-case';
import { ExecuteRunCommand } from 'src/domain/runs/application/use-cases/execute-run/execute-run.command';
import { FindThreadUseCase } from 'src/domain/threads/application/use-cases/find-thread/find-thread.use-case';
import { FindThreadQuery } from 'src/domain/threads/application/use-cases/find-thread/find-thread.query';
import { GenerateAndSetThreadTitleUseCase } from 'src/domain/threads/application/use-cases/generate-and-set-thread-title/generate-and-set-thread-title.use-case';
import { GenerateAndSetThreadTitleCommand } from 'src/domain/threads/application/use-cases/generate-and-set-thread-title/generate-and-set-thread-title.command';
import {
  RunEvent,
  RunMasksEvent,
  RunMessageEvent,
  RunThreadEvent,
  RunErrorEvent,
  RunSessionEvent,
} from 'src/domain/runs/application/run-events';
import {
  RunPiiMasksUpdate,
  type RunStreamItem,
} from 'src/domain/runs/domain/run-pii-masks-update.entity';
import type { Message } from 'src/domain/messages/domain/message.entity';
import {
  RunInput,
  RunUserInput,
} from 'src/domain/runs/domain/run-input.entity';
import { RunNoModelFoundError } from 'src/domain/runs/application/runs.errors';
import { Thread } from 'src/domain/threads/domain/thread.entity';
import { AnonymizeTextForOrgUseCase } from 'src/domain/anonymization-settings/application/use-cases/anonymize-text-for-org/anonymize-text-for-org.use-case';
import { AnonymizeTextForOrgCommand } from 'src/domain/anonymization-settings/application/use-cases/anonymize-text-for-org/anonymize-text-for-org.command';
import {
  ApplicationError,
  INTERNAL_SERVER_ERROR_MESSAGE,
} from 'src/common/errors/base.error';
import { reportUnexpectedError } from 'src/common/errors/report-unexpected-error.helper';
import { ContextService } from 'src/common/context/services/context.service';
import { RunAnonymizationUnavailableError } from 'src/domain/runs/application/runs.errors';
import type { RunExecutionOutcome } from 'src/domain/runs/application/run-execution-outcome';

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
      yield this.sessionEvent(command.threadId, true);
      yield* this.executeRun(command);
    } catch (error) {
      this.logger.error(
        { err: error instanceof Error ? error : new Error(String(error)) },
        'Error in executeRunAndSetTitle',
      );
      // The SSE response was committed as 200 before the run started, so the
      // global exception filter never sees this failure — report it here or
      // provider outages produce no AppSignal incident at all (AYC-653).
      reportUnexpectedError(error);
      yield this.toErrorEvent(error, command.threadId);
    } finally {
      yield this.sessionEvent(command.threadId, false);
    }
  }

  private async *executeRun(
    command: ExecuteRunAndSetTitleCommand,
  ): AsyncGenerator<RunEvent> {
    const { thread } = await this.findThreadUseCase.execute(
      new FindThreadQuery(command.threadId),
    );
    const shouldGenerateTitle = thread.messages.length === 0;
    const messages = await this.executeRunUseCase.execute(
      new ExecuteRunCommand({
        threadId: command.threadId,
        input: command.input,
        streaming: command.streaming,
        signal: command.signal,
      }),
    );
    const outcome = yield* this.streamRunItems(messages, command.threadId);
    if (shouldGenerateTitle && outcome !== 'aborted') {
      const titleEvent = await this.generateTitle(command, thread);
      if (titleEvent) yield titleEvent;
    }
  }

  private async *streamRunItems(
    messages: AsyncGenerator<RunStreamItem, RunExecutionOutcome | void, void>,
    threadId: UUID,
  ): AsyncGenerator<RunEvent, RunExecutionOutcome | void, void> {
    let completed = false;
    try {
      for (;;) {
        const next = await messages.next();
        if (next.done) {
          completed = true;
          return next.value;
        }
        yield this.toStreamEvent(next.value, threadId);
      }
    } finally {
      if (!completed) await messages.return(undefined);
    }
  }

  private sessionEvent(threadId: UUID, streaming: boolean): RunSessionEvent {
    return {
      type: 'session',
      streaming,
      threadId,
      timestamp: new Date().toISOString(),
    };
  }

  private toErrorEvent(error: unknown, threadId: UUID): RunErrorEvent {
    const clientError =
      error instanceof ApplicationError ? error.toClientResponse() : undefined;
    return {
      type: 'error',
      message: clientError?.message ?? INTERNAL_SERVER_ERROR_MESSAGE,
      threadId,
      timestamp: new Date().toISOString(),
      code: clientError?.code ?? 'EXECUTION_ERROR',
      details: clientError?.metadata,
    };
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
          id: mask.id,
          token: mask.token,
          value: mask.value,
          category: mask.category,
          unmasked: mask.unmasked,
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

      this.logger.log(
        { threadId: command.threadId, isAnonymous: thread.isAnonymous },
        'Generating thread title',
      );

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

      return title ? this.titleUpdatedEvent(thread.id, title) : null;
    } catch (error) {
      this.logger.warn(
        {
          threadId: command.threadId,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        'Error in generateTitle',
      );
      return null;
    }
  }

  private titleUpdatedEvent(threadId: UUID, title: string): RunThreadEvent {
    return {
      type: 'thread',
      threadId,
      updateType: 'title_updated',
      title,
      timestamp: new Date().toISOString(),
    };
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
      this.logger.log(
        {
          originalLength: text.length,
          anonymizedLength: result.anonymizedText.length,
          replacementsCount: result.replacements.length,
        },
        'Anonymized text for title generation',
      );
    }
    return result.anonymizedText;
  }
}
