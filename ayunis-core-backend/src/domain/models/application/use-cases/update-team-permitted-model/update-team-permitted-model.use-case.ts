import { Injectable, Logger } from '@nestjs/common';
import { PermittedModelsRepository } from 'src/domain/models/application/ports/permitted-models.repository';
import { UpdateTeamPermittedModelCommand } from './update-team-permitted-model.command';
import { PermittedLanguageModel } from 'src/domain/models/domain/permitted-model.entity';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import {
  NotALanguageModelError,
  UnexpectedModelError,
} from 'src/domain/models/application/models.errors';
import { TeamPermittedModelValidator } from 'src/domain/models/application/services/team-permitted-model-validator.service';
import { LanguageModel } from 'src/domain/models/domain/models/language.model';

@Injectable()
export class UpdateTeamPermittedModelUseCase {
  private readonly logger = new Logger(UpdateTeamPermittedModelUseCase.name);

  constructor(
    private readonly permittedModelsRepository: PermittedModelsRepository,
    private readonly validator: TeamPermittedModelValidator,
  ) {}

  @HandleUnexpectedErrors(UnexpectedModelError)
  async execute(
    command: UpdateTeamPermittedModelCommand,
  ): Promise<PermittedLanguageModel> {
    this.logger.log(
      {
        permittedModelId: command.permittedModelId,
        orgId: command.orgId,
        teamId: command.teamId,
        ...command.policy,
      },
      'execute',
    );

    this.validator.validateAdminAccess(command.orgId);
    await this.validator.validateTeamInOrg(command.teamId, command.orgId);
    const existing = await this.validator.validateModelBelongsToTeam(
      command.permittedModelId,
      command.teamId,
      command.orgId,
    );

    if (!(existing.model instanceof LanguageModel)) {
      throw new NotALanguageModelError(existing.model.id);
    }

    return (await this.permittedModelsRepository.update({
      id: existing.id,
      orgId: existing.orgId,
      policy: command.policy,
    })) as PermittedLanguageModel;
  }
}
