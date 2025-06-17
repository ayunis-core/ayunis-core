import { Injectable, Logger } from '@nestjs/common';
import { ManageOrgDefaultModelCommand } from './manage-org-default-model.command';
import { PermittedModel } from '../../../domain/permitted-model.entity';
import { PermittedModelsRepository } from '../../ports/permitted-models.repository';
import {
  ModelError,
  PermittedModelNotFoundByIdError,
} from '../../models.errors';

@Injectable()
export class ManageOrgDefaultModelUseCase {
  private readonly logger = new Logger(ManageOrgDefaultModelUseCase.name);

  constructor(
    private readonly permittedModelsRepository: PermittedModelsRepository,
  ) {}

  async execute(
    command: ManageOrgDefaultModelCommand,
  ): Promise<PermittedModel> {
    this.logger.log('execute', {
      permittedModelId: command.permittedModelId,
      orgId: command.orgId,
    });

    try {
      // First, verify that the permitted model exists and belongs to the organization
      const permittedModel = await this.permittedModelsRepository.findOne({
        id: command.permittedModelId,
        orgId: command.orgId,
      });

      if (!permittedModel) {
        this.logger.error('Permitted model not found', {
          permittedModelId: command.permittedModelId,
          orgId: command.orgId,
        });
        throw new PermittedModelNotFoundByIdError(command.permittedModelId);
      }

      // Check if there's already a default model
      const existingDefault = await this.permittedModelsRepository.findDefault(
        command.orgId,
      );

      const action = existingDefault ? 'updating' : 'setting';
      this.logger.debug(
        `Permitted model found, ${action} organization default`,
        {
          permittedModelId: command.permittedModelId,
          orgId: command.orgId,
          modelName: permittedModel.model.name,
          modelProvider: permittedModel.model.provider,
          existingDefaultId: existingDefault?.id,
        },
      );

      // Set the model as the organization's default (handles both create and update)
      const orgDefaultModel = await this.permittedModelsRepository.setAsDefault(
        {
          id: command.permittedModelId,
          orgId: command.orgId,
        },
      );

      this.logger.debug(`Organization default model ${action} successfully`, {
        orgId: command.orgId,
        modelId: orgDefaultModel.id,
        action,
      });

      return orgDefaultModel;
    } catch (error) {
      if (error instanceof ModelError) {
        throw error;
      }
      this.logger.error('Failed to manage organization default model', {
        permittedModelId: command.permittedModelId,
        orgId: command.orgId,
        error,
      });
      throw error;
    }
  }
}
