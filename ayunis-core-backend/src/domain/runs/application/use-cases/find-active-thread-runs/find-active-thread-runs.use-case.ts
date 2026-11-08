import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { ContextService } from 'src/common/context/services/context.service';
import { getRequiredUserContext } from 'src/common/context/required-context';
import { UnexpectedRunError } from 'src/domain/runs/application/runs.errors';
import {
  ActiveThreadRuns,
  type ActiveThreadRunSummary,
} from 'src/domain/runs/application/services/active-thread-runs.service';

@Injectable()
export class FindActiveThreadRunsUseCase {
  private readonly logger = new Logger(FindActiveThreadRunsUseCase.name);

  constructor(
    private readonly contextService: ContextService,
    private readonly activeThreadRuns: ActiveThreadRuns,
  ) {}

  @HandleUnexpectedErrors(UnexpectedRunError)
  execute(): Promise<ActiveThreadRunSummary[]> {
    const { userId } = getRequiredUserContext(this.contextService);
    this.logger.debug({ userId }, 'findActiveThreadRuns');
    return Promise.resolve(this.activeThreadRuns.listForUser(userId));
  }
}
