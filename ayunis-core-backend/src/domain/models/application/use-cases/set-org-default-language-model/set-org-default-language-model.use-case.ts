import { Injectable, Logger } from '@nestjs/common';
import { SetOrgDefaultLanguageModelCommand } from './set-org-default-language-model.command';
import { PermittedLanguageModel } from 'src/domain/models/domain/permitted-model.entity';
import { PermittedModelsRepository } from 'src/domain/models/application/ports/permitted-models.repository';
import {
  ModelError,
  PermittedModelNotFoundError,
} from 'src/domain/models/application/models.errors';
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
    this.logger.log(
      { permittedModelId: command.permittedModelId, orgId: command.orgId },
      'execute',
    );
    try {
      return await this.setDefault(command);
    } catch (error) {
      if (error instanceof ModelError) throw error;
      this.logger.error(
        {
          permittedModelId: command.permittedModelId,
          orgId: command.orgId,
          err: error instanceof Error ? error : new Error('Unknown error'),
        },
        'Failed to set organization default model',
      );
      throw error;
    }
  }

  private async setDefault(
    command: SetOrgDefaultLanguageModelCommand,
  ): Promise<PermittedLanguageModel> {
    this.assertAuthorized(command.orgId);
    const permittedModel = await this.findPermittedModel(command);
    const existingDefault =
      await this.permittedModelsRepository.findOrgDefaultLanguage(
        command.orgId,
      );
    const action = existingDefault ? 'updating' : 'setting';
    this.logger.debug(
      {
        permittedModelId: command.permittedModelId,
        orgId: command.orgId,
        modelName: permittedModel.model.name,
        modelProvider: permittedModel.model.provider,
        existingDefaultId: existingDefault?.id,
        action,
      },
      'Permitted model found for organization default',
    );
    const result = await this.permittedModelsRepository.setAsDefault({
      id: command.permittedModelId,
      orgId: command.orgId,
    });
    this.logger.debug(
      { orgId: command.orgId, modelId: result.id, action },
      'Organization default model changed successfully',
    );
    return result;
  }

  private assertAuthorized(orgId: string): void {
    const isFromOrg = this.contextService.get('orgId') === orgId;
    const isSuperAdmin =
      this.contextService.get('systemRole') === SystemRole.SUPER_ADMIN;
    if (!isFromOrg && !isSuperAdmin) throw new UnauthorizedAccessError();
  }

  private async findPermittedModel(
    command: SetOrgDefaultLanguageModelCommand,
  ): Promise<PermittedLanguageModel> {
    const model = await this.permittedModelsRepository.findOneLanguage({
      id: command.permittedModelId,
      orgId: command.orgId,
    });
    if (model) return model;
    this.logger.error(
      { permittedModelId: command.permittedModelId, orgId: command.orgId },
      'Permitted model not found',
    );
    throw new PermittedModelNotFoundError(command.permittedModelId);
  }
}
