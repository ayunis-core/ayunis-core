import { Injectable, Logger } from '@nestjs/common';
import { Trial } from 'src/iam/subscriptions/domain/trial.entity';
import { TrialRepository } from '../../ports/trial.repository';
import { CreateTrialCommand } from './create-trial.command';

@Injectable()
export class CreateTrialUseCase {
  private readonly logger = new Logger(CreateTrialUseCase.name);

  constructor(private readonly trialRepository: TrialRepository) {}

  async execute(command: CreateTrialCommand): Promise<Trial> {
    this.logger.debug('Creating trial for organization', {
      orgId: command.orgId,
      maxMessages: command.maxMessages,
    });

    const trial = new Trial({
      orgId: command.orgId,
      maxMessages: command.maxMessages,
      messagesSent: 0,
    });

    const createdTrial = await this.trialRepository.create(trial);

    this.logger.log('Trial created successfully', {
      trialId: createdTrial.id,
      orgId: createdTrial.orgId,
      maxMessages: createdTrial.maxMessages,
    });

    return createdTrial;
  }
}
