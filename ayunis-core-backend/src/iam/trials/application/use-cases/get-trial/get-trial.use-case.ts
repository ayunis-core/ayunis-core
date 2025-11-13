import { Injectable, Logger } from '@nestjs/common';
import { Trial } from 'src/iam/trials/domain/trial.entity';
import { TrialRepository } from '../../ports/trial.repository';
import { GetTrialQuery } from './get-trial.query';
import { UnexpectedTrialError } from '../../trial.errors';
import { ApplicationError } from 'src/common/errors/base.error';

@Injectable()
export class GetTrialUseCase {
  private readonly logger = new Logger(GetTrialUseCase.name);

  constructor(private readonly trialRepository: TrialRepository) {}

  async execute(query: GetTrialQuery): Promise<Trial | null> {
    this.logger.debug('Getting trial for organization', {
      orgId: query.orgId,
    });

    try {
      this.logger.debug('Finding trial in repository');
      const trial = await this.trialRepository.findByOrgId(query.orgId);

      if (trial) {
        this.logger.debug('Trial found', {
          trialId: trial.id,
          orgId: trial.orgId,
          messagesSent: trial.messagesSent,
          maxMessages: trial.maxMessages,
          remainingMessages: trial.maxMessages - trial.messagesSent,
        });
      } else {
        this.logger.debug('Trial not found', {
          orgId: query.orgId,
        });
      }

      return trial;
    } catch (error) {
      if (error instanceof ApplicationError) {
        // Already logged and properly typed error, just rethrow
        throw error;
      }
      this.logger.error('Failed to get trial', {
        error: error instanceof Error ? error.message : 'Unknown error',
        orgId: query.orgId,
      });
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

