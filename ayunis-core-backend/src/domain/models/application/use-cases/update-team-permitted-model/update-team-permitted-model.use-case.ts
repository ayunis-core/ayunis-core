import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { LanguageModel } from 'src/domain/models/domain/models/language.model';
import { PermittedLanguageModel } from 'src/domain/models/domain/permitted-model.entity';
import {
  NotALanguageModelError,
  UnexpectedModelError,
} from '../../models.errors';
import { PermittedModelsRepository } from '../../ports/permitted-models.repository';
import { TeamPermittedModelValidator } from '../../services/team-permitted-model-validator.service';
import { UpdateTeamPermittedModelCommand } from './update-team-permitted-model.command';

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
    if (
      command.anonymousOnly === undefined &&
      command.internetAccessEnabled === undefined
    ) {
      return existing as PermittedLanguageModel;
    }
    return (await this.permittedModelsRepository.update({
      id: existing.id,
      orgId: existing.orgId,
      ...(command.anonymousOnly !== undefined && {
        anonymousOnly: command.anonymousOnly,
      }),
      ...(command.internetAccessEnabled !== undefined && {
        internetAccessEnabled: command.internetAccessEnabled,
      }),
    })) as PermittedLanguageModel;
  }
}
