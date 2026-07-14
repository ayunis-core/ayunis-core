import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { Injectable, Logger } from '@nestjs/common';
import { Trial } from 'src/iam/trials/domain/trial.entity';
import { TrialRepository } from '../../ports/trial.repository';
import { GetTrialQuery } from './get-trial.query';
import { TrialNotFoundError, UnexpectedTrialError } from '../../trial.errors';

@Injectable()
export class GetTrialUseCase {
  private readonly logger = new Logger(GetTrialUseCase.name);

  constructor(private readonly trialRepository: TrialRepository) {}

  @HandleUnexpectedErrors(UnexpectedTrialError)
  async execute(query: GetTrialQuery): Promise<Trial> {
    this.logger.debug('Getting trial for organization', {
      orgId: query.orgId,
    });

    this.logger.debug('Finding trial in repository');
    const trial = await this.trialRepository.findByOrgId(query.orgId);

    if (!trial) {
      throw new TrialNotFoundError(query.orgId);
    }

    return trial;
  }
}
