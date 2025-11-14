import { Injectable, Logger } from '@nestjs/common';
import { Trial } from 'src/iam/trials/domain/trial.entity';
import { TrialRepository } from '../../ports/trial.repository';
import { UpdateTrialCommand } from './update-trial.command';
import {
  TrialNotFoundError,
  TrialUpdateFailedError,
  UnexpectedTrialError,
} from '../../trial.errors';
import { ApplicationError } from 'src/common/errors/base.error';
import { SystemRole } from 'src/iam/users/domain/value-objects/system-role.enum';
import { ContextService } from 'src/common/context/services/context.service';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';

@Injectable()
export class UpdateTrialUseCase {
  private readonly logger = new Logger(UpdateTrialUseCase.name);

  constructor(
    private readonly trialRepository: TrialRepository,
    private readonly contextService: ContextService,
  ) {}

  async execute(command: UpdateTrialCommand): Promise<Trial> {
    try {
      this.logger.debug('Finding existing trial');
      const systemRole = this.contextService.get<SystemRole>('systemRole');
      if (systemRole !== SystemRole.SUPER_ADMIN) {
        throw new UnauthorizedAccessError({
          orgId: command.orgId,
          systemRole: systemRole,
        });
      }
      this.logger.log('Updating trial for organization', {
        orgId: command.orgId,
        maxMessages: command.maxMessages,
        messagesSent: command.messagesSent,
      });
      const existingTrial = await this.trialRepository.findByOrgId(
        command.orgId,
      );

      if (!existingTrial) {
        this.logger.warn('Trial not found for organization', {
          orgId: command.orgId,
        });

        throw new TrialNotFoundError(command.orgId);
      }

      this.logger.debug('Updating trial entity');
      const updatedTrial = new Trial({
        id: existingTrial.id,
        createdAt: existingTrial.createdAt,
        updatedAt: new Date(),
        orgId: existingTrial.orgId,
        messagesSent:
          command.messagesSent !== undefined
            ? command.messagesSent
            : existingTrial.messagesSent,
        maxMessages:
          command.maxMessages !== undefined
            ? command.maxMessages
            : existingTrial.maxMessages,
      });

      this.logger.debug('Saving updated trial to repository');
      const savedTrial = await this.trialRepository.update(updatedTrial);

      if (!savedTrial) {
        this.logger.error('Failed to update trial in repository', {
          orgId: command.orgId,
        });

        throw new TrialUpdateFailedError(
          command.orgId,
          'Repository operation failed',
        );
      }

      this.logger.log('Trial updated successfully', {
        trialId: savedTrial.id,
        orgId: savedTrial.orgId,
        maxMessages: savedTrial.maxMessages,
        messagesSent: savedTrial.messagesSent,
      });

      return savedTrial;
    } catch (error) {
      if (error instanceof ApplicationError) {
        // Already logged and properly typed error, just rethrow
        throw error;
      }

      this.logger.error('Trial update failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        orgId: command.orgId,
      });

      throw new UnexpectedTrialError(
        command.orgId,
        'Unexpected error during trial update',
        { ...(error instanceof Error && { originalError: error.message }) },
      );
    }
  }
}
