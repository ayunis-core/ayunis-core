import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { ContextService } from 'src/common/context/services/context.service';
import { getRequiredUserContext } from 'src/common/context/required-context';
import { UnexpectedRunError } from 'src/domain/runs/application/runs.errors';
import { ActiveThreadRuns } from 'src/domain/runs/application/services/active-thread-runs.service';
import { CancelThreadRunCommand } from './cancel-thread-run.command';

/**
 * Stops the current user's runs on the thread, which then roll back their
 * unfinished turn. Idempotent: a finished, missing or foreign run is ignored,
 * as is a run that cannot be cancelled (a routine execution).
 */
@Injectable()
export class CancelThreadRunUseCase {
  private readonly logger = new Logger(CancelThreadRunUseCase.name);

  constructor(
    private readonly contextService: ContextService,
    private readonly activeThreadRuns: ActiveThreadRuns,
  ) {}

  @HandleUnexpectedErrors(UnexpectedRunError)
  execute(command: CancelThreadRunCommand): Promise<void> {
    const { userId } = getRequiredUserContext(this.contextService);
    this.logger.log({ threadId: command.threadId }, 'cancelThreadRun');
    this.activeThreadRuns.cancel(command.threadId, userId);
    return Promise.resolve();
  }
}
