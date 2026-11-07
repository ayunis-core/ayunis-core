import { Injectable, Logger } from '@nestjs/common';
import type { UUID } from 'crypto';
import { ContextService } from 'src/common/context/services/context.service';
import { getRequiredUserContext } from 'src/common/context/required-context';
import { IncrementTrialMessagesUseCase } from 'src/iam/trials/application/use-cases/increment-trial-messages/increment-trial-messages.use-case';
import { IncrementTrialMessagesCommand } from 'src/iam/trials/application/use-cases/increment-trial-messages/increment-trial-messages.command';
import type { RunEvent } from 'src/domain/runs/application/run-events';
import { RunUserInput } from 'src/domain/runs/domain/run-input.entity';
import { ActiveThreadRuns } from 'src/domain/runs/application/services/active-thread-runs.service';
import type { ActiveThreadRun } from 'src/domain/runs/application/services/active-thread-run';
import { ExecuteRunAndSetTitleUseCase } from 'src/domain/runs/application/use-cases/execute-run-and-set-title/execute-run-and-set-title.use-case';
import { ExecuteRunAndSetTitleCommand } from 'src/domain/runs/application/use-cases/execute-run-and-set-title/execute-run-and-set-title.command';
import { SendMessageCommand } from './send-message.command';

/**
 * Starts the run detached from the request and streams it to the requester.
 * The requester leaving ends only its stream: the run keeps going until it
 * finishes, its owner cancels it, or nobody has watched it for a while.
 */
@Injectable()
export class SendMessageUseCase {
  private readonly logger = new Logger(SendMessageUseCase.name);

  constructor(
    private readonly executeRunAndSetTitleUseCase: ExecuteRunAndSetTitleUseCase,
    private readonly incrementTrialMessagesUseCase: IncrementTrialMessagesUseCase,
    private readonly contextService: ContextService,
    private readonly activeThreadRuns: ActiveThreadRuns,
  ) {}

  async *execute(command: SendMessageCommand): AsyncGenerator<RunEvent> {
    const run = this.startRun(command);
    yield* run.subscribe(command.signal);
  }

  private startRun(command: SendMessageCommand): ActiveThreadRun {
    try {
      const { userId, orgId } = getRequiredUserContext(this.contextService);
      if (command.consumeTrialMessage) {
        this.consumeTrialMessage(orgId);
      }
      return this.activeThreadRuns.startDetached(
        { threadId: command.threadId, userId },
        (signal) => this.runEvents(command, signal),
      );
    } catch (error) {
      if (command.input instanceof RunUserInput) command.input.releaseImages();
      throw error;
    }
  }

  private async *runEvents(
    command: SendMessageCommand,
    signal: AbortSignal,
  ): AsyncGenerator<RunEvent> {
    try {
      yield* this.executeRunAndSetTitleUseCase.execute(
        new ExecuteRunAndSetTitleCommand({
          threadId: command.threadId,
          input: command.input,
          streaming: command.streaming,
          signal,
        }),
      );
    } finally {
      // The run releases its images once they are persisted; this covers
      // failures before it got that far.
      if (command.input instanceof RunUserInput) command.input.releaseImages();
    }
  }

  private consumeTrialMessage(orgId: UUID): void {
    this.logger.debug(
      {
        orgId,
      },
      'Incrementing trial messages for non-subscription org',
    );

    // Fire-and-forget by design: trial accounting must not delay or fail the
    // run. The .catch keeps a failure out of the unhandledRejection path.
    this.incrementTrialMessagesUseCase
      .execute(new IncrementTrialMessagesCommand(orgId))
      .catch((error: unknown) => {
        this.logger.error(
          {
            orgId,
            error: error instanceof Error ? error.message : String(error),
          },
          'Failed to increment trial messages',
        );
      });
  }
}
