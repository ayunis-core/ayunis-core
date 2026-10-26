import { DefaultModelSelectionsRepository } from 'src/domain/models/application/ports/default-model-selections.repository';
import { Injectable, Logger } from '@nestjs/common';
import { SetTeamDefaultModelCommand } from './set-team-default-model.command';
import { PermittedLanguageModel } from 'src/domain/models/domain/permitted-model.entity';
import { ApplicationError } from 'src/common/errors/base.error';
import {
  NotALanguageModelError,
  PermittedModelNotFoundError,
  UnexpectedModelError,
} from 'src/domain/models/application/models.errors';
import { TeamPermittedModelValidator } from 'src/domain/models/application/services/team-permitted-model-validator.service';

@Injectable()
export class SetTeamDefaultModelUseCase {
  private readonly logger = new Logger(SetTeamDefaultModelUseCase.name);

  constructor(
    private readonly validator: TeamPermittedModelValidator,
    private readonly defaultModelSelectionsRepository: DefaultModelSelectionsRepository,
  ) {}

  async execute(
    command: SetTeamDefaultModelCommand,
  ): Promise<PermittedLanguageModel> {
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
      const permittedModel = await this.validator.validateModelBelongsToTeam(
        command.permittedModelId,
        command.teamId,
        command.orgId,
      );
      if (!(permittedModel instanceof PermittedLanguageModel)) {
        throw new NotALanguageModelError(permittedModel.model.id);
      }
      if (permittedModel.model.isArchived) {
        throw new PermittedModelNotFoundError(command.permittedModelId);
      }

      // Replaces a team mode default too: one default per team.
      await this.defaultModelSelectionsRepository.setModel(
        { teamId: command.teamId },
        permittedModel.id,
      );
      return new PermittedLanguageModel({ ...permittedModel, isDefault: true });
    } catch (error) {
      if (error instanceof ApplicationError) {
        throw error;
      }
      this.logger.error({ err: error }, 'Error setting team default model');
      throw new UnexpectedModelError(
        error instanceof Error ? error : new Error('Unknown error'),
      );
    }
  }
}
