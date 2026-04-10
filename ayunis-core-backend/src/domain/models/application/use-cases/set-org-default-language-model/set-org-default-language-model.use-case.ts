import { Injectable, Logger } from '@nestjs/common';
import { SetOrgDefaultLanguageModelCommand } from './set-org-default-language-model.command';
import { PermittedLanguageModel } from '../../../domain/permitted-model.entity';
import { PermittedModelsRepository } from '../../ports/permitted-models.repository';
import { ModelError, PermittedModelNotFoundError } from '../../models.errors';
import { ContextService } from 'src/common/context/services/context.service';
import { SystemRole } from 'src/iam/users/domain/value-objects/system-role.enum';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';

@Injectable()
export class SetOrgDefaultLanguageModelUseCase {
  private readonly logger = new Logger(SetOrgDefaultLanguageModelUseCase.name);

  constructor(
    private readonly permittedModelsRepository: PermittedModelsRepository,
    private readonly contextService: ContextService,
  ) {}

  async execute(
    command: SetOrgDefaultLanguageModelCommand,
  ): Promise<PermittedLanguageModel> {
    this.logger.log('execute', {
      permittedModelId: command.permittedModelId,
      orgId: command.orgId,
    });

    try {
      // Check if the user is authorized to set the organization default model
      const orgId = this.contextService.get('orgId');
      const systemRole = this.contextService.get('systemRole');
      const isFromOrg = orgId === command.orgId;
      const isSuperAdmin = systemRole === SystemRole.SUPER_ADMIN;
      if (!isFromOrg && !isSuperAdmin) {
        throw new UnauthorizedAccessError();
      }

      // Only language models may participate in org-default flows.
      const permittedModel =
        await this.permittedModelsRepository.findOneLanguage({
          id: command.permittedModelId,
          orgId: command.orgId,
        });

      if (!permittedModel) {
        this.logger.error('Permitted model not found', {
          permittedModelId: command.permittedModelId,
          orgId: command.orgId,
        });
        throw new PermittedModelNotFoundError(command.permittedModelId);
      }

      // Check if there's already a default model
      const existingDefault =
        await this.permittedModelsRepository.findOrgDefaultLanguage(
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
      this.logger.error('Failed to set organization default model', {
        permittedModelId: command.permittedModelId,
        orgId: command.orgId,
        error: error instanceof Error ? error : new Error('Unknown error'),
      });
      throw error;
    }
  }
}
