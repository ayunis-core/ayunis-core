import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { UserContextRunner } from 'src/common/context/services/user-context-runner.service';
import { ApplicationError } from 'src/common/errors/base.error';
import { CreateThreadUseCase } from 'src/domain/threads/application/use-cases/create-thread/create-thread.use-case';
import { CreateThreadCommand } from 'src/domain/threads/application/use-cases/create-thread/create-thread.command';
import { ExecuteUnattendedRunUseCase } from 'src/domain/runs/application/use-cases/execute-unattended-run/execute-unattended-run.use-case';
import { ExecuteUnattendedRunCommand } from 'src/domain/runs/application/use-cases/execute-unattended-run/execute-unattended-run.command';
import type { UnattendedRunResult } from 'src/domain/runs/application/use-cases/execute-unattended-run/unattended-run-result';
import { RunUserInput } from 'src/domain/runs/domain/run-input.entity';
import { FindUserByIdUseCase } from 'src/iam/users/application/use-cases/find-user-by-id/find-user-by-id.use-case';
import { FindUserByIdQuery } from 'src/iam/users/application/use-cases/find-user-by-id/find-user-by-id.query';
import { UserNotFoundError } from 'src/iam/users/application/users.errors';
import type { User } from 'src/iam/users/domain/user.entity';
import { RoutinesRepository } from 'src/domain/routines/application/ports/routines.repository';
import {
  RoutineOwnerLockedError,
  UnexpectedRoutineError,
} from 'src/domain/routines/application/routines.errors';
import { RoutineModelService } from 'src/domain/routines/application/services/routine-model.service';
import { RoutineSubscriptionGate } from 'src/domain/routines/application/services/routine-subscription-gate.service';
import type { Routine } from 'src/domain/routines/domain/routine.entity';
import type { RoutineRunOutcome } from 'src/domain/routines/domain/routine-run-outcome';
import { RoutineRunStatus } from 'src/domain/routines/domain/routine-run-status.enum';
import { routineThreadTitle } from 'src/domain/routines/domain/routine-thread-title';
import { ROUTINE_FAILURE_REASON_MAX_LENGTH } from 'src/domain/routines/domain/routines.constants';
import { ExecuteRoutineCommand } from './execute-routine.command';

const UNEXPECTED_FAILURE = 'UNEXPECTED_ERROR';

/**
 * One execution of a routine on behalf of its owner, as a chat message would
 * run: same subscription/trial gate, model access check (when the thread is
 * created) and credit gate (inside the run). Every outcome is recorded on the
 * routine; only failures that are not the routine's own (bugs, provider
 * outages) are rethrown so the queue reports them. Returns null when the
 * routine or its owner no longer exists.
 */
@Injectable()
export class ExecuteRoutineUseCase {
  private readonly logger = new Logger(ExecuteRoutineUseCase.name);

  constructor(
    private readonly routinesRepository: RoutinesRepository,
    private readonly findUserByIdUseCase: FindUserByIdUseCase,
    private readonly userContextRunner: UserContextRunner,
    private readonly subscriptionGate: RoutineSubscriptionGate,
    private readonly routineModelService: RoutineModelService,
    private readonly createThreadUseCase: CreateThreadUseCase,
    private readonly executeUnattendedRunUseCase: ExecuteUnattendedRunUseCase,
    private readonly configService: ConfigService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedRoutineError)
  async execute(
    command: ExecuteRoutineCommand,
  ): Promise<RoutineRunOutcome | null> {
    this.logger.log({ routineId: command.routineId }, 'Executing routine');
    const routine = await this.routinesRepository.findByIdForExecution(
      command.routineId,
    );
    if (!routine) {
      this.logger.warn(
        { routineId: command.routineId },
        'Routine no longer exists, skipping',
      );
      return null;
    }
    // Every failure after the routine was found is recorded, so a run never
    // stays shown as queued or running (jobs are not retried).
    let outcome: RoutineRunOutcome | null;
    let unexpected: Error | undefined;
    try {
      outcome = await this.executeForOwner(routine);
    } catch (error) {
      outcome = { status: 'failed', failureReason: failureReasonOf(error) };
      if (!isExpectedFailure(error)) {
        unexpected = error instanceof Error ? error : new Error(String(error));
      }
    }
    if (outcome) {
      await this.routinesRepository.recordRunOutcome(
        routine.id,
        outcome,
        new Date(),
      );
      this.logger.log(
        { routineId: routine.id, ...outcome },
        'Routine finished',
      );
    }
    if (unexpected) throw unexpected;
    return outcome;
  }

  private async executeForOwner(
    routine: Routine,
  ): Promise<RoutineRunOutcome | null> {
    const owner = await this.findOwner(routine);
    if (!owner) {
      this.logger.warn(
        { routineId: routine.id },
        'Routine owner no longer exists, skipping',
      );
      return null;
    }
    return this.userContextRunner.runAsUser(
      {
        userId: owner.id,
        orgId: owner.orgId,
        role: owner.role,
        systemRole: owner.systemRole,
      },
      async () => {
        await this.routinesRepository.setRunStatus(
          routine.id,
          RoutineRunStatus.RUNNING,
        );
        return this.run(routine, owner);
      },
    );
  }

  private async findOwner(routine: Routine): Promise<User | null> {
    try {
      return await this.findUserByIdUseCase.execute(
        new FindUserByIdQuery(routine.userId),
      );
    } catch (error) {
      if (error instanceof UserNotFoundError) return null;
      throw error;
    }
  }

  private async run(routine: Routine, owner: User): Promise<RoutineRunOutcome> {
    if (owner.lockedAt) throw new RoutineOwnerLockedError();
    await this.subscriptionGate.admit(routine.orgId);
    const thread = await this.createThreadUseCase.execute(
      new CreateThreadCommand({
        modelId: await this.routineModelService.forRun(routine),
        title: routineThreadTitle(routine.name, new Date()),
        routineId: routine.id,
      }),
    );
    const result = await this.executeUnattendedRunUseCase.execute(
      new ExecuteUnattendedRunCommand({
        threadId: thread.id,
        input: new RunUserInput(routine.prompt),
        profile: {
          id: 'routine',
          routine: {
            name: routine.name,
            internetEnabled: routine.internetEnabled,
          },
        },
        signal: AbortSignal.timeout(this.timeoutMs()),
      }),
    );
    return toOutcome(result);
  }

  private timeoutMs(): number {
    const minutes = this.configService.get<number>(
      'routines.runTimeoutMinutes',
      15,
    );
    return minutes * 60_000;
  }
}

function toOutcome(result: UnattendedRunResult): RoutineRunOutcome {
  switch (result.status) {
    case 'done':
      return { status: 'succeeded' };
    case 'failed':
      return { status: 'failed', failureReason: result.reason };
    case 'aborted':
      return { status: 'failed', failureReason: 'timeout' };
  }
}

function failureReasonOf(error: unknown): string {
  return error instanceof ApplicationError
    ? error.code.slice(0, ROUTINE_FAILURE_REASON_MAX_LENGTH)
    : UNEXPECTED_FAILURE;
}

/** The routine's own failure (access, credits, limits), not an incident. */
function isExpectedFailure(error: unknown): boolean {
  return error instanceof ApplicationError && error.statusCode < 500;
}
