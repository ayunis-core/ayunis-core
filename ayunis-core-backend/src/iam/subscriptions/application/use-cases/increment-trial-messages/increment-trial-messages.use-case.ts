import { Injectable, Logger } from '@nestjs/common';
import { Trial } from 'src/iam/subscriptions/domain/trial.entity';
import { TrialRepository } from '../../ports/trial.repository';
import { IncrementTrialMessagesCommand } from './increment-trial-messages.command';
import {
  TrialNotFoundError,
  TrialCapacityExceededError,
  TrialUpdateFailedError,
  UnexpectedTrialError,
} from '../../subscription.errors';
import { ApplicationError } from 'src/common/errors/base.error';

@Injectable()
export class IncrementTrialMessagesUseCase {
  private readonly logger = new Logger(IncrementTrialMessagesUseCase.name);

  constructor(private readonly trialRepository: TrialRepository) {}

  async execute(command: IncrementTrialMessagesCommand): Promise<Trial> {
    this.logger.debug('Incrementing trial messages', {
      orgId: command.orgId,
    });

    try {
      this.logger.debug('Finding trial for organization');
      const currentTrial = await this.trialRepository.findByOrgId(
        command.orgId,
      );

      if (!currentTrial) {
        this.logger.warn('Trial not found for organization', {
          orgId: command.orgId,
        });

        throw new TrialNotFoundError(command.orgId);
      }

      this.logger.debug('Checking trial capacity');
      if (currentTrial.messagesSent >= currentTrial.maxMessages) {
        this.logger.warn('Trial capacity exceeded, cannot increment', {
          orgId: command.orgId,
          messagesSent: currentTrial.messagesSent,
          maxMessages: currentTrial.maxMessages,
          remainingMessages:
            currentTrial.maxMessages - currentTrial.messagesSent,
        });

        throw new TrialCapacityExceededError(
          command.orgId,
          currentTrial.messagesSent,
          currentTrial.maxMessages,
        );
      }

      this.logger.debug('Incrementing trial message count');
      const updatedTrial = await this.trialRepository.incrementMessagesSent(
        command.orgId,
      );

      if (!updatedTrial) {
        this.logger.error('Failed to increment trial messages in repository', {
          orgId: command.orgId,
        });

        throw new TrialUpdateFailedError(
          command.orgId,
          'Repository operation failed',
          { operation: 'incrementMessagesSent' },
        );
      }

      this.logger.log('Trial messages incremented successfully', {
        orgId: command.orgId,
        messagesSent: updatedTrial.messagesSent,
        maxMessages: updatedTrial.maxMessages,
        remainingMessages: updatedTrial.maxMessages - updatedTrial.messagesSent,
      });

      return updatedTrial;
    } catch (error) {
      if (error instanceof ApplicationError) {
        throw error;
      }

      this.logger.error('Failed to increment trial messages', {
        error: error instanceof Error ? error.message : 'Unknown error',
        orgId: command.orgId,
      });

      throw new UnexpectedTrialError(
        command.orgId,
        'Unexpected error during trial message increment',
        { ...(error instanceof Error && { originalError: error.message }) },
      );
    }
  }
}
