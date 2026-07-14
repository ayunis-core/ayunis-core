import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { PermittedModelsRepository } from '../../ports/permitted-models.repository';
import { DeleteTeamPermittedModelCommand } from './delete-team-permitted-model.command';
import { UnexpectedModelError } from '../../models.errors';
import { TeamPermittedModelValidator } from '../../services/team-permitted-model-validator.service';

@Injectable()
export class DeleteTeamPermittedModelUseCase {
  private readonly logger = new Logger(DeleteTeamPermittedModelUseCase.name);

  constructor(
    private readonly permittedModelsRepository: PermittedModelsRepository,
    private readonly validator: TeamPermittedModelValidator,
  ) {}

  @HandleUnexpectedErrors(UnexpectedModelError)
  async execute(command: DeleteTeamPermittedModelCommand): Promise<void> {
    this.logger.log('execute', {
      permittedModelId: command.permittedModelId,
      orgId: command.orgId,
      teamId: command.teamId,
    });

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
  }
}
