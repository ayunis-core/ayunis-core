import { Injectable, Logger } from '@nestjs/common';
import { PermittedModelsRepository } from '../../ports/permitted-models.repository';
import { SetTeamDefaultModelCommand } from './set-team-default-model.command';
import { PermittedLanguageModel } from 'src/domain/models/domain/permitted-model.entity';
import { PermittedModelScope } from 'src/domain/models/domain/value-objects/permitted-model-scope.enum';
import { ApplicationError } from 'src/common/errors/base.error';
import {
  PermittedModelNotFoundError,
  UnexpectedModelError,
} from '../../models.errors';
import { TeamPermittedModelValidator } from '../../services/team-permitted-model-validator.service';

@Injectable()
export class SetTeamDefaultModelUseCase {
  private readonly logger = new Logger(SetTeamDefaultModelUseCase.name);

  constructor(
    private readonly permittedModelsRepository: PermittedModelsRepository,
    private readonly validator: TeamPermittedModelValidator,
  ) {}

  async execute(
    command: SetTeamDefaultModelCommand,
  ): Promise<PermittedLanguageModel> {
    this.logger.log('execute', {
      permittedModelId: command.permittedModelId,
      orgId: command.orgId,
      teamId: command.teamId,
    });

    try {
      this.validator.validateAdminAccess(command.orgId);
      await this.validator.validateTeamInOrg(command.teamId, command.orgId);
      await this.validateModelBelongsToTeam(command);

      return this.permittedModelsRepository.setAsDefault({
        id: command.permittedModelId,
        orgId: command.orgId,
        teamId: command.teamId,
      });
    } catch (error) {
      if (error instanceof ApplicationError) {
        throw error;
      }
      this.logger.error('Error setting team default model', error);
      throw new UnexpectedModelError(
        error instanceof Error ? error : new Error('Unknown error'),
      );
    }
  }

  private async validateModelBelongsToTeam(
    command: SetTeamDefaultModelCommand,
  ): Promise<void> {
    const model = await this.permittedModelsRepository.findOne({
      id: command.permittedModelId,
      orgId: command.orgId,
    });

    if (!model) {
      throw new PermittedModelNotFoundError(command.permittedModelId);
    }

    if (
      model.scope !== PermittedModelScope.TEAM ||
      model.teamId !== command.teamId
    ) {
      throw new PermittedModelNotFoundError(command.permittedModelId);
    }
  }
}
