import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
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
  constructor(
    @InjectPinoLogger(UpdateTrialUseCase.name)
    private readonly logger: PinoLogger,
    private readonly trialRepository: TrialRepository,
    private readonly contextService: ContextService,
  ) {}

  async execute(command: UpdateTrialCommand): Promise<Trial> {
    try {
      this.ensureSuperAdmin(command.orgId);
      const existingTrial = await this.findTrial(command.orgId);
      return await this.updateTrial(command, existingTrial);
    } catch (error) {
      if (error instanceof ApplicationError) {
        // Already logged and properly typed error, just rethrow
        throw error;
      }

      this.logger.error(
        { err: error as Error, orgId: command.orgId },
        'Trial update failed',
      );

      throw new UnexpectedTrialError(
        command.orgId,
        'Unexpected error during trial update',
        { ...(error instanceof Error && { originalError: error.message }) },
      );
    }
  }

  private ensureSuperAdmin(orgId: UpdateTrialCommand['orgId']): void {
    const systemRole = this.contextService.get<SystemRole>('systemRole');
    if (systemRole !== SystemRole.SUPER_ADMIN) {
      throw new UnauthorizedAccessError({ orgId, systemRole });
    }
  }

  private async findTrial(orgId: UpdateTrialCommand['orgId']): Promise<Trial> {
    const trial = await this.trialRepository.findByOrgId(orgId);
    if (!trial) {
      this.logger.warn({ orgId }, 'Trial not found for organization');
      throw new TrialNotFoundError(orgId);
    }
    return trial;
  }

  private async updateTrial(
    command: UpdateTrialCommand,
    existingTrial: Trial,
  ): Promise<Trial> {
    this.logger.info(
      {
        orgId: command.orgId,
        maxMessages: command.maxMessages,
        messagesSent: command.messagesSent,
      },
      'Updating trial for organization',
    );
    const updatedTrial = new Trial({
      id: existingTrial.id,
      createdAt: existingTrial.createdAt,
      updatedAt: new Date(),
      orgId: existingTrial.orgId,
      messagesSent: command.messagesSent ?? existingTrial.messagesSent,
      maxMessages: command.maxMessages ?? existingTrial.maxMessages,
    });
    const savedTrial = await this.trialRepository.update(updatedTrial);
    // Persistence implementations are guarded even when their port types are non-null.
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (!savedTrial) {
      this.logger.error(
        { orgId: command.orgId },
        'Failed to update trial in repository',
      );
      throw new TrialUpdateFailedError(
        command.orgId,
        'Repository operation failed',
      );
    }
    this.logger.info(
      {
        trialId: savedTrial.id,
        orgId: savedTrial.orgId,
        maxMessages: savedTrial.maxMessages,
        messagesSent: savedTrial.messagesSent,
      },
      'Trial updated successfully',
    );
    return savedTrial;
  }
}
