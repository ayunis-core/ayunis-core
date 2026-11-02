import { DefaultModelSelectionsRepository } from 'src/domain/models/application/ports/default-model-selections.repository';
import { PermittedModelScope } from 'src/domain/models/domain/value-objects/permitted-model-scope.enum';
import { Injectable, Logger } from '@nestjs/common';
import { SetOrgDefaultLanguageModelCommand } from './set-org-default-language-model.command';
import { PermittedLanguageModel } from 'src/domain/models/domain/permitted-model.entity';
import { PermittedModelsRepository } from 'src/domain/models/application/ports/permitted-models.repository';
import {
  ModelError,
  PermittedModelNotFoundError,
} from 'src/domain/models/application/models.errors';
import { ContextService } from 'src/common/context/services/context.service';
import { isSuperAdmin } from 'src/common/context/required-context';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';

@Injectable()
export class SetOrgDefaultLanguageModelUseCase {
  private readonly logger = new Logger(SetOrgDefaultLanguageModelUseCase.name);

  constructor(
    private readonly permittedModelsRepository: PermittedModelsRepository,
    private readonly contextService: ContextService,
    private readonly defaultModelSelectionsRepository: DefaultModelSelectionsRepository,
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
    // Replaces an org mode default too: one default per org.
    await this.defaultModelSelectionsRepository.setModel(
      { orgId: command.orgId },
      permittedModel.id,
    );
    this.logger.debug(
      { orgId: command.orgId, modelId: permittedModel.id },
      'Organization default model changed successfully',
    );
    return new PermittedLanguageModel({ ...permittedModel, isDefault: true });
  }

  private assertAuthorized(orgId: string): void {
    const isFromOrg = this.contextService.get('orgId') === orgId;
    if (!isFromOrg && !isSuperAdmin(this.contextService)) {
      throw new UnauthorizedAccessError();
    }
  }

  private async findPermittedModel(
    command: SetOrgDefaultLanguageModelCommand,
  ): Promise<PermittedLanguageModel> {
    const model = await this.permittedModelsRepository.findOneLanguage({
      id: command.permittedModelId,
      orgId: command.orgId,
    });
    // An org default must be an active, organization-wide grant.
    if (model?.scope === PermittedModelScope.ORG && !model.model.isArchived) {
      return model;
    }
    this.logger.error(
      { permittedModelId: command.permittedModelId, orgId: command.orgId },
      'Permitted model not found',
    );
    throw new PermittedModelNotFoundError(command.permittedModelId);
  }
}
