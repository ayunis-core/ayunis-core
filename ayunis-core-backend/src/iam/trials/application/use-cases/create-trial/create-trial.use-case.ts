import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { Injectable, Logger } from '@nestjs/common';
import { Trial } from 'src/iam/trials/domain/trial.entity';
import { TrialRepository } from '../../ports/trial.repository';
import { CreateTrialCommand } from './create-trial.command';
import {
  TrialCreationFailedError,
  TrialAlreadyExistsError,
  UnexpectedTrialError,
} from '../../trial.errors';

@Injectable()
export class CreateTrialUseCase {
  private readonly logger = new Logger(CreateTrialUseCase.name);

  constructor(private readonly trialRepository: TrialRepository) {}

  @HandleUnexpectedErrors(UnexpectedTrialError)
  async execute(command: CreateTrialCommand): Promise<Trial> {
    this.logger.log('Creating trial for organization', {
      orgId: command.orgId,
      maxMessages: command.maxMessages,
    });

    this.logger.debug('Checking if trial already exists');
    const existingTrial = await this.trialRepository.findByOrgId(command.orgId);

    if (existingTrial) {
      this.logger.warn('Trial already exists for organization', {
        orgId: command.orgId,
        existingTrialId: existingTrial.id,
      });

      throw new TrialAlreadyExistsError(command.orgId, {
        existingTrialId: existingTrial.id,
      });
    }

    this.logger.debug('Creating trial entity');
    const trial = new Trial({
      orgId: command.orgId,
      maxMessages: command.maxMessages,
      messagesSent: 0,
    });

    this.logger.debug('Saving trial to repository');
    const createdTrial = await this.trialRepository.create(trial);

    if (!createdTrial) {
      this.logger.error('Failed to create trial in repository', {
        orgId: command.orgId,
      });

      throw new TrialCreationFailedError(
        command.orgId,
        'Repository operation failed',
      );
    }

    this.logger.log('Trial created successfully', {
      trialId: createdTrial.id,
      orgId: createdTrial.orgId,
      maxMessages: createdTrial.maxMessages,
      messagesSent: createdTrial.messagesSent,
    });

    return createdTrial;
  }
}
