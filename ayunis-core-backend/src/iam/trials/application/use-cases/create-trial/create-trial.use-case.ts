import { Injectable, Logger } from '@nestjs/common';
import { Trial } from 'src/iam/trials/domain/trial.entity';
import { TrialRepository } from 'src/iam/trials/application/ports/trial.repository';
import { CreateTrialCommand } from './create-trial.command';
import {
  TrialCreationFailedError,
  TrialAlreadyExistsError,
  UnexpectedTrialError,
} from 'src/iam/trials/application/trial.errors';
import { ApplicationError } from 'src/common/errors/base.error';

@Injectable()
export class CreateTrialUseCase {
  private readonly logger = new Logger(CreateTrialUseCase.name);

  constructor(private readonly trialRepository: TrialRepository) {}

  async execute(command: CreateTrialCommand): Promise<Trial> {
    this.logger.log(
      {
        orgId: command.orgId,
        maxMessages: command.maxMessages,
      },
      'Creating trial for organization',
    );

    try {
      await this.ensureTrialDoesNotExist(command.orgId);
      return await this.createTrial(command);
    } catch (error) {
      if (error instanceof ApplicationError) throw error;

      this.logger.error(
        {
          err: error as Error,
          orgId: command.orgId,
          maxMessages: command.maxMessages,
        },
        'Trial creation failed',
      );

      throw new UnexpectedTrialError(
        command.orgId,
        'Unexpected error during trial creation',
        { ...(error instanceof Error && { originalError: error.message }) },
      );
    }
  }

  private async ensureTrialDoesNotExist(
    orgId: CreateTrialCommand['orgId'],
  ): Promise<void> {
    const existingTrial = await this.trialRepository.findByOrgId(orgId);
    if (existingTrial) {
      this.logger.warn(
        { orgId, existingTrialId: existingTrial.id },
        'Trial already exists for organization',
      );
      throw new TrialAlreadyExistsError(orgId, {
        existingTrialId: existingTrial.id,
      });
    }
  }

  private async createTrial(command: CreateTrialCommand): Promise<Trial> {
    const trial = new Trial({
      orgId: command.orgId,
      maxMessages: command.maxMessages,
      messagesSent: 0,
    });
    const createdTrial = await this.trialRepository.create(trial);
    // Persistence implementations are guarded even when their port types are non-null.
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (!createdTrial) {
      this.logger.error(
        { orgId: command.orgId },
        'Failed to create trial in repository',
      );
      throw new TrialCreationFailedError(
        command.orgId,
        'Repository operation failed',
      );
    }
    this.logger.log(
      {
        trialId: createdTrial.id,
        orgId: createdTrial.orgId,
        maxMessages: createdTrial.maxMessages,
        messagesSent: createdTrial.messagesSent,
      },
      'Trial created successfully',
    );
    return createdTrial;
  }
}
