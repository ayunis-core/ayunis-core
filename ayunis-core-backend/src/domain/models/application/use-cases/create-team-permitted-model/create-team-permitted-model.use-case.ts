import { Injectable, Logger } from '@nestjs/common';
import { PermittedModelsRepository } from '../../ports/permitted-models.repository';
import { ModelsRepository } from '../../ports/models.repository';
import { CreateTeamPermittedModelCommand } from './create-team-permitted-model.command';
import { PermittedModel } from 'src/domain/models/domain/permitted-model.entity';
import { PermittedModelScope } from 'src/domain/models/domain/value-objects/permitted-model-scope.enum';
import { ApplicationError } from 'src/common/errors/base.error';
import {
  DuplicateTeamPermittedModelError,
  ModelNotFoundError,
  NotALanguageModelError,
  UnexpectedModelError,
} from '../../models.errors';
import { TeamPermittedModelValidator } from '../../services/team-permitted-model-validator.service';
import { LanguageModel } from 'src/domain/models/domain/models/language.model';

@Injectable()
export class CreateTeamPermittedModelUseCase {
  private readonly logger = new Logger(CreateTeamPermittedModelUseCase.name);

  constructor(
    private readonly permittedModelsRepository: PermittedModelsRepository,
    private readonly modelsRepository: ModelsRepository,
    private readonly validator: TeamPermittedModelValidator,
  ) {}

  async execute(
    command: CreateTeamPermittedModelCommand,
  ): Promise<PermittedModel> {
    this.logger.log('execute', {
      modelId: command.modelId,
      orgId: command.orgId,
      teamId: command.teamId,
    });

    try {
      this.validator.validateAdminAccess(command.orgId);
      await this.validator.validateTeamInOrg(command.teamId, command.orgId);
      await this.validateModelIsOrgPermitted(command.modelId, command.orgId);
      await this.validateNoDuplicate(command);

      const model = await this.modelsRepository.findOne({
        id: command.modelId,
      });
      if (!model) {
        throw new ModelNotFoundError(command.modelId);
      }

      if (!(model instanceof LanguageModel)) {
        throw new NotALanguageModelError(command.modelId);
      }

      const permittedModel = new PermittedModel({
        model,
        orgId: command.orgId,
        anonymousOnly: command.anonymousOnly,
        scope: PermittedModelScope.TEAM,
        scopeId: command.teamId,
      });

      return await this.permittedModelsRepository.create(permittedModel);
    } catch (error) {
      if (error instanceof ApplicationError) {
        throw error;
      }
      this.logger.error('Error creating team permitted model', error);
      throw new UnexpectedModelError(
        error instanceof Error ? error : new Error('Unknown error'),
      );
    }
  }

  private async validateModelIsOrgPermitted(
    modelId: CreateTeamPermittedModelCommand['modelId'],
    orgId: CreateTeamPermittedModelCommand['orgId'],
  ): Promise<void> {
    const orgPermittedModels = await this.permittedModelsRepository.findAll(
      orgId,
      { modelId },
    );
    if (orgPermittedModels.length === 0) {
      throw new ModelNotFoundError(modelId, {
        reason: 'Model is not permitted at the organization level',
      });
    }
  }

  private async validateNoDuplicate(
    command: CreateTeamPermittedModelCommand,
  ): Promise<void> {
    const existing = await this.permittedModelsRepository.findByTeamAndModelId(
      command.teamId,
      command.modelId,
      command.orgId,
    );
    if (existing) {
      throw new DuplicateTeamPermittedModelError(
        command.teamId,
        command.modelId,
      );
    }
  }
}
