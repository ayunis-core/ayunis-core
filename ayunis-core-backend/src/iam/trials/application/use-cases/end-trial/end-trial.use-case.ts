import { Injectable, Logger } from '@nestjs/common';
import type { UUID } from 'crypto';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { TrialRepository } from 'src/iam/trials/application/ports/trial.repository';
import { UnexpectedTrialSyncError } from 'src/iam/trials/application/trial.errors';

@Injectable()
export class EndTrialUseCase {
  private readonly logger = new Logger(EndTrialUseCase.name);

  constructor(private readonly trials: TrialRepository) {}

  @HandleUnexpectedErrors(UnexpectedTrialSyncError)
  async execute(orgId: UUID): Promise<boolean> {
    this.logger.log(
      { orgId },
      'Ending free trial after subscription activation',
    );
    return this.trials.endRemainingAllowance(orgId);
  }
}
