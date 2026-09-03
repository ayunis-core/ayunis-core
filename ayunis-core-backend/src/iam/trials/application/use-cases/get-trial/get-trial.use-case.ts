import { Injectable, Logger } from '@nestjs/common';
import { Trial } from 'src/iam/trials/domain/trial.entity';
import { TrialRepository } from 'src/iam/trials/application/ports/trial.repository';
import { GetTrialQuery } from './get-trial.query';
import {
  TrialNotFoundError,
  UnexpectedTrialError,
} from 'src/iam/trials/application/trial.errors';
import { ApplicationError } from 'src/common/errors/base.error';

@Injectable()
export class GetTrialUseCase {
  private readonly logger = new Logger(GetTrialUseCase.name);

  constructor(private readonly trialRepository: TrialRepository) {}

  async execute(query: GetTrialQuery): Promise<Trial> {
    this.logger.debug(
      {
        orgId: query.orgId,
      },
      'Getting trial for organization',
    );

    try {
      this.logger.debug('Finding trial in repository');
      const trial = await this.trialRepository.findByOrgId(query.orgId);

      if (!trial) {
        throw new TrialNotFoundError(query.orgId);
      }

      return trial;
    } catch (error) {
      if (error instanceof ApplicationError) {
        // Already logged and properly typed error, just rethrow
        throw error;
      }
      this.logger.error(
        { err: error as Error, orgId: query.orgId },
        'Failed to get trial',
      );
      throw new UnexpectedTrialError(
        query.orgId,
        'Unexpected error during trial retrieval',
        {
          operation: 'get-trial',
          ...(error instanceof Error && { originalError: error.message }),
        },
      );
    }
  }
}
