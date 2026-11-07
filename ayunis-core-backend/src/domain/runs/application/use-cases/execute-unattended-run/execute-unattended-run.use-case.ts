import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { AssistantMessage } from 'src/domain/messages/domain/messages/assistant-message.entity';
import {
  RunNudgeInput,
  type RunUserInput,
} from 'src/domain/runs/domain/run-input.entity';
import { UnexpectedRunError } from 'src/domain/runs/application/runs.errors';
import type { RunExecutionOutcome } from 'src/domain/runs/application/run-execution-outcome';
import { RunProfileRegistry } from 'src/domain/runs/application/run-profiles/run-profile.registry';
import { ExecuteRunCommand } from 'src/domain/runs/application/use-cases/execute-run/execute-run.command';
import { ExecuteRunUseCase } from 'src/domain/runs/application/use-cases/execute-run/execute-run.use-case';
import { ContextService } from 'src/common/context/services/context.service';
import { getRequiredUserContext } from 'src/common/context/required-context';
import { ActiveThreadRuns } from 'src/domain/runs/application/services/active-thread-runs.service';
import type { ActiveThreadRun } from 'src/domain/runs/application/services/active-thread-run';
import type { RunCompletionPolicy } from 'src/domain/runs/application/run-profiles/run-profile';
import {
  runErrorEvent,
  runSessionEvent,
  runStreamItemEvent,
} from 'src/domain/runs/application/helpers/run-event.helper';
import type { ExecuteUnattendedRunCommand } from './execute-unattended-run.command';
import type { UnattendedRunResult } from './unattended-run-result';

interface FinishedRun {
  outcome: RunExecutionOutcome;
  lastAssistantMessage?: AssistantMessage;
}

/**
 * Runs a profile nobody has to listen to: drains each run's stream and
 * applies the profile's completion policy, nudging on the same thread until
 * it is done or failed. The owner can watch the whole execution, nudges
 * included, as one active run on the thread, but cannot cancel it. Run
 * errors propagate to the caller. Expects the owner's user context to be set.
 */
@Injectable()
export class ExecuteUnattendedRunUseCase {
  private readonly logger = new Logger(ExecuteUnattendedRunUseCase.name);

  constructor(
    private readonly executeRunUseCase: ExecuteRunUseCase,
    private readonly runProfileRegistry: RunProfileRegistry,
    private readonly contextService: ContextService,
    private readonly activeThreadRuns: ActiveThreadRuns,
  ) {}

  @HandleUnexpectedErrors(UnexpectedRunError)
  async execute(
    command: ExecuteUnattendedRunCommand,
  ): Promise<UnattendedRunResult> {
    this.logger.log(
      { threadId: command.threadId, profile: command.profile.id },
      'executeUnattendedRun',
    );
    const policy = this.runProfileRegistry.get(
      command.profile.id,
    ).completionPolicy;
    const { userId } = getRequiredUserContext(this.contextService);
    const watched = this.activeThreadRuns.open({
      threadId: command.threadId,
      userId,
    });
    watched.publish(runSessionEvent(command.threadId, true));
    try {
      return await this.runUntilDecided(command, policy, watched);
    } catch (error) {
      watched.publish(runErrorEvent(error, command.threadId));
      throw error;
    } finally {
      watched.publish(runSessionEvent(command.threadId, false));
      watched.close();
    }
  }

  private async runUntilDecided(
    command: ExecuteUnattendedRunCommand,
    policy: RunCompletionPolicy,
    watched: ActiveThreadRun,
  ): Promise<UnattendedRunResult> {
    let input = command.input;
    for (let nudges = 0; ; nudges++) {
      const run = await this.runToEnd(command, input, watched);
      if (run.outcome === 'aborted') return { status: 'aborted', nudges };
      const decision = policy.decide({
        lastAssistantMessage: run.lastAssistantMessage,
        nudges,
      });
      if (decision.status !== 'nudge') return { ...decision, nudges };
      if (command.signal.aborted) return { status: 'aborted', nudges };
      this.logger.log(
        { threadId: command.threadId, nudge: nudges + 1 },
        'Nudging unattended run',
      );
      input = new RunNudgeInput(decision.message);
    }
  }

  private async runToEnd(
    command: ExecuteUnattendedRunCommand,
    input: RunUserInput,
    watched: ActiveThreadRun,
  ): Promise<FinishedRun> {
    const stream = await this.executeRunUseCase.execute(
      new ExecuteRunCommand({
        threadId: command.threadId,
        input,
        profile: command.profile,
        signal: command.signal,
      }),
    );
    let lastAssistantMessage: AssistantMessage | undefined;
    for (;;) {
      const next = await stream.next();
      if (next.done) {
        return { outcome: next.value ?? 'completed', lastAssistantMessage };
      }
      watched.publish(runStreamItemEvent(next.value, command.threadId));
      // Streaming snapshots of a turn come before its final message, which
      // shares their ID, so the last one seen is always the final turn.
      if (next.value instanceof AssistantMessage) {
        lastAssistantMessage = next.value;
      }
    }
  }
}
