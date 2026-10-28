import { Injectable, Logger } from '@nestjs/common';
import { Trial } from 'src/iam/trials/domain/trial.entity';
import { TrialRepository } from 'src/iam/trials/application/ports/trial.repository';
import { IncrementTrialMessagesCommand } from './increment-trial-messages.command';
import {
  TrialNotFoundError,
  TrialCapacityExceededError,
  TrialUpdateFailedError,
  UnexpectedTrialError,
} from 'src/iam/trials/application/trial.errors';
import { ApplicationError } from 'src/common/errors/base.error';

@Injectable()
export class IncrementTrialMessagesUseCase {
  private readonly logger = new Logger(IncrementTrialMessagesUseCase.name);

  constructor(private readonly trialRepository: TrialRepository) {}

  async execute(command: IncrementTrialMessagesCommand): Promise<Trial> {
    this.logger.debug(
      {
        orgId: command.orgId,
      },
      'Incrementing trial messages',
    );

    try {
      const trial = await this.findTrial(command.orgId);
      this.ensureCapacity(command.orgId, trial);
      return await this.incrementMessages(command.orgId);
    } catch (error) {
      if (error instanceof ApplicationError) {
        throw error;
      }

      this.logger.error(
        { err: error as Error, orgId: command.orgId },
        'Failed to increment trial messages',
      );

      throw new UnexpectedTrialError(
        command.orgId,
        'Unexpected error during trial message increment',
        { ...(error instanceof Error && { originalError: error.message }) },
      );
    }
  }

  private async findTrial(
    orgId: IncrementTrialMessagesCommand['orgId'],
  ): Promise<Trial> {
    const trial = await this.trialRepository.findByOrgId(orgId);
    if (!trial) {
      this.logger.warn({ orgId }, 'Trial not found for organization');
      throw new TrialNotFoundError(orgId);
    }
    return trial;
  }

  private ensureCapacity(
    orgId: IncrementTrialMessagesCommand['orgId'],
    trial: Trial,
  ): void {
    if (trial.messagesSent < trial.maxMessages) return;
    this.logger.warn(
      {
        orgId,
        messagesSent: trial.messagesSent,
        maxMessages: trial.maxMessages,
        remainingMessages: trial.maxMessages - trial.messagesSent,
      },
      'Trial capacity exceeded, cannot increment',
    );
    throw new TrialCapacityExceededError(
      orgId,
      trial.messagesSent,
      trial.maxMessages,
    );
  }

  private async incrementMessages(
    orgId: IncrementTrialMessagesCommand['orgId'],
  ): Promise<Trial> {
    const trial = await this.trialRepository.incrementMessagesSent(orgId);
    if (!trial) {
      this.logger.error(
        { orgId },
        'Failed to increment trial messages in repository',
      );
      throw new TrialUpdateFailedError(orgId, 'Repository operation failed', {
        operation: 'incrementMessagesSent',
      });
    }
    this.logger.log(
      {
        orgId,
        messagesSent: trial.messagesSent,
        maxMessages: trial.maxMessages,
        remainingMessages: trial.maxMessages - trial.messagesSent,
      },
      'Trial messages incremented successfully',
    );
    return trial;
  }
}
