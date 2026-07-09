import { Injectable } from '@nestjs/common';
import type { UUID } from 'crypto';
import { BaseUseCase } from 'src/common/use-case/base-use-case';
import { SetUserDefaultLanguageModelCommand } from './set-user-default-language-model.command';
import { PermittedLanguageModel } from '../../../domain/permitted-model.entity';
import { PermittedModelsRepository } from '../../ports/permitted-models.repository';
import { UserDefaultModelsRepository } from '../../ports/user-default-models.repository';
import { ModelError, PermittedModelNotFoundError } from '../../models.errors';
import { ContextService } from 'src/common/context/services/context.service';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';

@Injectable()
export class SetUserDefaultLanguageModelUseCase extends BaseUseCase {
  constructor(
    private readonly permittedModelsRepository: PermittedModelsRepository,
    private readonly userDefaultModelsRepository: UserDefaultModelsRepository,
    private readonly contextService: ContextService,
  ) {
    super();
  }

  async execute(
    command: SetUserDefaultLanguageModelCommand,
  ): Promise<PermittedLanguageModel> {
    this.logger.log('execute', {
      userId: command.userId,
      permittedModelId: command.permittedModelId,
      orgId: command.orgId,
    });

    try {
      this.ensureAuthorized(command.userId);
      const permittedModel = await this.findPermittedLanguageModel(command);
      const action = await this.getDefaultAction(command.userId);

      this.logBeforeSet(permittedModel, action);
      const userDefaultModel = await this.setUserDefault(
        command,
        permittedModel,
      );
      this.logAfterSet(command.userId, userDefaultModel.id, action);

      return userDefaultModel;
    } catch (error) {
      if (error instanceof ModelError) {
        throw error;
      }
      this.logger.error('Failed to set user default model', {
        userId: command.userId,
        permittedModelId: command.permittedModelId,
        orgId: command.orgId,
        error: error instanceof Error ? error : new Error('Unknown error'),
      });
      throw error;
    }
  }

  private ensureAuthorized(userId: string): void {
    if (this.contextService.get('userId') !== userId) {
      throw new UnauthorizedAccessError();
    }
  }

  private async findPermittedLanguageModel(
    command: SetUserDefaultLanguageModelCommand,
  ): Promise<PermittedLanguageModel> {
    const permittedModel = await this.permittedModelsRepository.findOneLanguage(
      {
        id: command.permittedModelId,
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
    userId: UUID,
  ): Promise<'setting' | 'updating'> {
    const existingUserDefault =
      await this.userDefaultModelsRepository.findByUserId(userId);

    return existingUserDefault ? 'updating' : 'setting';
  }

  private logBeforeSet(
    permittedModel: PermittedLanguageModel,
    action: 'setting' | 'updating',
  ): void {
    this.logger.debug(`Permitted model found, ${action} user default`, {
      modelName: permittedModel.model.name,
      modelProvider: permittedModel.model.provider,
    });
  }

  private async setUserDefault(
    command: SetUserDefaultLanguageModelCommand,
    permittedModel: PermittedLanguageModel,
  ): Promise<PermittedLanguageModel> {
    return await this.userDefaultModelsRepository.setAsDefault(
      permittedModel,
      command.userId,
    );
  }

  private logAfterSet(
    userId: string,
    modelId: string,
    action: 'setting' | 'updating',
  ): void {
    this.logger.debug(`User default model ${action} successfully`, {
      userId,
      modelId,
      action,
    });
  }
}
