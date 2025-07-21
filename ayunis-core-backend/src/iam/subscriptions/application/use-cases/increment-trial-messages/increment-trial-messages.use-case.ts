import { Injectable, Logger } from '@nestjs/common';
import { Trial } from 'src/iam/subscriptions/domain/trial.entity';
import { TrialRepository } from '../../ports/trial.repository';
import { IncrementTrialMessagesCommand } from './increment-trial-messages.command';

@Injectable()
export class IncrementTrialMessagesUseCase {
  private readonly logger = new Logger(IncrementTrialMessagesUseCase.name);

  constructor(private readonly trialRepository: TrialRepository) {}

  async execute(command: IncrementTrialMessagesCommand): Promise<Trial> {
    this.logger.debug('Incrementing trial messages', {
      orgId: command.orgId,
    });

    try {
      const currentTrial = await this.trialRepository.findByOrgId(
        command.orgId,
      );

      if (!currentTrial) {
        this.logger.error('Trial not found for organization', {
          orgId: command.orgId,
        });
        throw new Error('Trial not found');
      }

      if (currentTrial.messagesSent >= currentTrial.maxMessages) {
        this.logger.warn('Trial capacity exceeded, cannot increment', {
          orgId: command.orgId,
          messagesSent: currentTrial.messagesSent,
          maxMessages: currentTrial.maxMessages,
        });
        throw new Error('Trial capacity exceeded');
      }

      const updatedTrial = await this.trialRepository.incrementMessagesSent(
        command.orgId,
      );

      if (!updatedTrial) {
        this.logger.error('Failed to increment trial messages', {
          orgId: command.orgId,
        });

        throw new Error('Failed to increment trial messages');
      }

      this.logger.log('Trial messages incremented successfully', {
        orgId: command.orgId,
        messagesSent: updatedTrial.messagesSent,
        maxMessages: updatedTrial.maxMessages,
        remainingMessages: updatedTrial.maxMessages - updatedTrial.messagesSent,
      });

      return updatedTrial;
    } catch (error) {
      this.logger.error('Failed to increment trial messages', {
        error: error instanceof Error ? error.message : 'Unknown error',
        orgId: command.orgId,
      });

      throw error;
    }
  }
}
