import { Injectable, Logger } from '@nestjs/common';
import { PermittedModelsRepository } from '../../ports/permitted-models.repository';
import { DeleteTeamPermittedModelCommand } from './delete-team-permitted-model.command';
import { ApplicationError } from 'src/common/errors/base.error';
import {
  PermittedModelDeletionFailedError,
  UnexpectedModelError,
} from '../../models.errors';
import { PermittedModelScope } from 'src/domain/models/domain/value-objects/permitted-model-scope.enum';
import { TeamPermittedModelValidator } from '../../services/team-permitted-model-validator.service';

@Injectable()
export class DeleteTeamPermittedModelUseCase {
  private readonly logger = new Logger(DeleteTeamPermittedModelUseCase.name);

  constructor(
    private readonly permittedModelsRepository: PermittedModelsRepository,
    private readonly validator: TeamPermittedModelValidator,
  ) {}

  async execute(command: DeleteTeamPermittedModelCommand): Promise<void> {
    this.logger.log('execute', {
      permittedModelId: command.permittedModelId,
      orgId: command.orgId,
      teamId: command.teamId,
    });

    try {
      this.validator.validateAdminAccess(command.orgId);
      await this.validator.validateTeamInOrg(command.teamId, command.orgId);

      const model = await this.permittedModelsRepository.findOne({
        id: command.permittedModelId,
        orgId: command.orgId,
      });

      if (!model) {
        throw new PermittedModelDeletionFailedError('Model not found', {
          modelId: command.permittedModelId,
        });
      }

      if (
        model.scope !== PermittedModelScope.TEAM ||
        model.teamId !== command.teamId
      ) {
        throw new PermittedModelDeletionFailedError(
          'Model does not belong to this team',
          { modelId: command.permittedModelId, teamId: command.teamId },
        );
      }

      await this.permittedModelsRepository.delete({
        id: command.permittedModelId,
        orgId: command.orgId,
      });
    } catch (error) {
      if (error instanceof ApplicationError) {
        throw error;
      }
      this.logger.error('Error deleting team permitted model', error);
      throw new UnexpectedModelError(
        error instanceof Error ? error : new Error('Unknown error'),
      );
    }
  }
}
