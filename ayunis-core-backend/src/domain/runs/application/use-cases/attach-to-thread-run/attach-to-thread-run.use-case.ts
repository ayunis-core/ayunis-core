import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { ContextService } from 'src/common/context/services/context.service';
import { getRequiredUserContext } from 'src/common/context/required-context';
import type { RunEvent } from 'src/domain/runs/application/run-events';
import { UnexpectedRunError } from 'src/domain/runs/application/runs.errors';
import { ActiveThreadRuns } from 'src/domain/runs/application/services/active-thread-runs.service';
import { AttachToThreadRunQuery } from './attach-to-thread-run.query';

export type ThreadRunSubscription = (
  signal: AbortSignal,
) => AsyncIterable<RunEvent>;

/**
 * Returns the current user's run in progress on the thread, replayed from
 * its start, or null when there is none. Another user's run is never found.
 */
@Injectable()
export class AttachToThreadRunUseCase {
  private readonly logger = new Logger(AttachToThreadRunUseCase.name);

  constructor(
    private readonly contextService: ContextService,
    private readonly activeThreadRuns: ActiveThreadRuns,
  ) {}

  @HandleUnexpectedErrors(UnexpectedRunError)
  execute(
    query: AttachToThreadRunQuery,
  ): Promise<ThreadRunSubscription | null> {
    const { userId } = getRequiredUserContext(this.contextService);
    this.logger.log({ threadId: query.threadId }, 'attachToThreadRun');
    const run = this.activeThreadRuns.find(query.threadId, userId);
    return Promise.resolve(
      run ? (signal: AbortSignal) => run.subscribe(signal) : null,
    );
  }
}
