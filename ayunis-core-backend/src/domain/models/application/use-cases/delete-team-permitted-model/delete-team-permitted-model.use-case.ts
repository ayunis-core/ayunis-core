import { Injectable, Logger } from '@nestjs/common';
import { PermittedModelsRepository } from 'src/domain/models/application/ports/permitted-models.repository';
import { DeleteTeamPermittedModelCommand } from './delete-team-permitted-model.command';
import { ApplicationError } from 'src/common/errors/base.error';
import { UnexpectedModelError } from 'src/domain/models/application/models.errors';
import { TeamPermittedModelValidator } from 'src/domain/models/application/services/team-permitted-model-validator.service';

@Injectable()
export class DeleteTeamPermittedModelUseCase {
  private readonly logger = new Logger(DeleteTeamPermittedModelUseCase.name);

  constructor(
    private readonly permittedModelsRepository: PermittedModelsRepository,
    private readonly validator: TeamPermittedModelValidator,
  ) {}

  async execute(command: DeleteTeamPermittedModelCommand): Promise<void> {
    this.logger.log(
      {
        permittedModelId: command.permittedModelId,
        orgId: command.orgId,
        teamId: command.teamId,
      },
      'execute',
    );

    try {
      this.validator.validateAdminAccess(command.orgId);
      await this.validator.validateTeamInOrg(command.teamId, command.orgId);
      await this.validator.validateModelBelongsToTeam(
        command.permittedModelId,
        command.teamId,
        command.orgId,
      );

      await this.permittedModelsRepository.delete({
        id: command.permittedModelId,
        orgId: command.orgId,
      });
    } catch (error) {
      if (error instanceof ApplicationError) {
        throw error;
      }
      this.logger.error({ err: error }, 'Error deleting team permitted model');
      throw new UnexpectedModelError(
        error instanceof Error ? error : new Error('Unknown error'),
      );
    }
  }
}
