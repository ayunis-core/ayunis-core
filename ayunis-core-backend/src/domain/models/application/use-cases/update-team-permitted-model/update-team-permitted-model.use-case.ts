import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { PermittedModelsRepository } from '../../ports/permitted-models.repository';
import { UpdateTeamPermittedModelCommand } from './update-team-permitted-model.command';
import { PermittedLanguageModel } from 'src/domain/models/domain/permitted-model.entity';
import {
  NotALanguageModelError,
  UnexpectedModelError,
} from '../../models.errors';
import { TeamPermittedModelValidator } from '../../services/team-permitted-model-validator.service';
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
    this.logger.log('execute', {
      permittedModelId: command.permittedModelId,
      orgId: command.orgId,
      teamId: command.teamId,
      anonymousOnly: command.anonymousOnly,
    });

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

    const updated = new PermittedLanguageModel({
      id: existing.id,
      model: existing.model,
      orgId: existing.orgId,
      scope: existing.scope,
      scopeId: existing.scopeId,
      isDefault: existing.isDefault,
      anonymousOnly: command.anonymousOnly,
      createdAt: existing.createdAt,
      updatedAt: new Date(),
    });

    return (await this.permittedModelsRepository.update(
      updated,
    )) as PermittedLanguageModel;
  }
}
