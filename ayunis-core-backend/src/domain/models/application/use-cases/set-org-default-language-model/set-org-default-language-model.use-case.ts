import { Injectable } from '@nestjs/common';
import type { UUID } from 'crypto';
import { BaseUseCase } from 'src/common/use-case/base-use-case';
import { SetOrgDefaultLanguageModelCommand } from './set-org-default-language-model.command';
import { PermittedLanguageModel } from '../../../domain/permitted-model.entity';
import { PermittedModelsRepository } from '../../ports/permitted-models.repository';
import { ModelError, PermittedModelNotFoundError } from '../../models.errors';
import { ContextService } from 'src/common/context/services/context.service';
import { SystemRole } from 'src/iam/users/domain/value-objects/system-role.enum';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';

@Injectable()
export class SetOrgDefaultLanguageModelUseCase extends BaseUseCase {
  constructor(
    private readonly permittedModelsRepository: PermittedModelsRepository,
    private readonly contextService: ContextService,
  ) {
    super();
  }

  async execute(
    command: SetOrgDefaultLanguageModelCommand,
  ): Promise<PermittedLanguageModel> {
    this.logger.log('execute', {
      permittedModelId: command.permittedModelId,
      orgId: command.orgId,
    });

    try {
      this.ensureAuthorized(command.orgId);
      const permittedModel = await this.findPermittedLanguageModel(command);
      const action = await this.getDefaultAction(command.orgId);

      this.logBeforeSet(command, permittedModel, action);
      const orgDefaultModel = await this.setOrgDefault(command);
      this.logAfterSet(command.orgId, orgDefaultModel.id, action);

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

  private ensureAuthorized(orgId: string): void {
    const currentOrgId = this.contextService.get('orgId');
    const systemRole = this.contextService.get('systemRole');
    const isFromOrg = currentOrgId === orgId;
    const isSuperAdmin = systemRole === SystemRole.SUPER_ADMIN;

    if (!isFromOrg && !isSuperAdmin) {
      throw new UnauthorizedAccessError();
    }
  }

  private async findPermittedLanguageModel(
    command: SetOrgDefaultLanguageModelCommand,
  ): Promise<PermittedLanguageModel> {
    const permittedModel = await this.permittedModelsRepository.findOneLanguage(
      {
        id: command.permittedModelId,
        orgId: command.orgId,
      },
    );
    if (permittedModel) {
      return permittedModel;
    }

    this.logger.error('Permitted model not found', {
      permittedModelId: command.permittedModelId,
      orgId: command.orgId,
    });
    throw new PermittedModelNotFoundError(command.permittedModelId);
  }

  private async getDefaultAction(
    orgId: UUID,
  ): Promise<'setting' | 'updating'> {
    const existingDefault =
      await this.permittedModelsRepository.findOrgDefaultLanguage(orgId);

    return existingDefault ? 'updating' : 'setting';
  }

  private logBeforeSet(
    command: SetOrgDefaultLanguageModelCommand,
    permittedModel: PermittedLanguageModel,
    action: 'setting' | 'updating',
  ): void {
    this.logger.debug(`Permitted model found, ${action} organization default`, {
      permittedModelId: command.permittedModelId,
      orgId: command.orgId,
      modelName: permittedModel.model.name,
      modelProvider: permittedModel.model.provider,
    });
  }

  private async setOrgDefault(
    command: SetOrgDefaultLanguageModelCommand,
  ): Promise<PermittedLanguageModel> {
    return await this.permittedModelsRepository.setAsDefault({
      id: command.permittedModelId,
      orgId: command.orgId,
    });
  }

  private logAfterSet(
    orgId: string,
    modelId: string,
    action: 'setting' | 'updating',
  ): void {
    this.logger.debug(`Organization default model ${action} successfully`, {
      orgId,
      modelId,
      action,
    });
  }
}
