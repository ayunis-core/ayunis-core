import { Injectable, Logger } from '@nestjs/common';
import { Trial } from 'src/iam/subscriptions/domain/trial.entity';
import { TrialRepository } from '../../ports/trial.repository';
import { GetTrialQuery } from './get-trial.query';

@Injectable()
export class GetTrialUseCase {
  private readonly logger = new Logger(GetTrialUseCase.name);

  constructor(private readonly trialRepository: TrialRepository) {}

  async execute(query: GetTrialQuery): Promise<Trial | null> {
    this.logger.debug('Getting trial for organization', {
      orgId: query.orgId,
    });

    try {
      const trial = await this.trialRepository.findByOrgId(query.orgId);

      if (trial) {
        this.logger.debug('Trial found', {
          trialId: trial.id,
          orgId: trial.orgId,
          messagesSent: trial.messagesSent,
          maxMessages: trial.maxMessages,
        });
      } else {
        this.logger.debug('Trial not found', {
          orgId: query.orgId,
        });
      }

      return trial;
    } catch (error) {
      this.logger.error('Failed to get trial', {
        error: error instanceof Error ? error.message : 'Unknown error',
        orgId: query.orgId,
      });
      throw error;
    }
  }
}
