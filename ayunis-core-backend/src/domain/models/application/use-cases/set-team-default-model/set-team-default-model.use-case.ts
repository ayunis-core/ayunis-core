import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { PermittedModelsRepository } from '../../ports/permitted-models.repository';
import { SetTeamDefaultModelCommand } from './set-team-default-model.command';
import { PermittedLanguageModel } from 'src/domain/models/domain/permitted-model.entity';
import { UnexpectedModelError } from '../../models.errors';
import { TeamPermittedModelValidator } from '../../services/team-permitted-model-validator.service';

@Injectable()
export class SetTeamDefaultModelUseCase {
  private readonly logger = new Logger(SetTeamDefaultModelUseCase.name);

  constructor(
    private readonly permittedModelsRepository: PermittedModelsRepository,
    private readonly validator: TeamPermittedModelValidator,
  ) {}

  @HandleUnexpectedErrors(UnexpectedModelError)
  async execute(
    command: SetTeamDefaultModelCommand,
  ): Promise<PermittedLanguageModel> {
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

    return await this.permittedModelsRepository.setAsDefault({
      id: command.permittedModelId,
      orgId: command.orgId,
      teamId: command.teamId,
    });
  }
}
