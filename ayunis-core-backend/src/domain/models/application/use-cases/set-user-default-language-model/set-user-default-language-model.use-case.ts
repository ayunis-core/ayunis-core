import { Injectable, Logger } from '@nestjs/common';
import { SetUserDefaultLanguageModelCommand } from './set-user-default-language-model.command';
import { PermittedLanguageModel } from 'src/domain/models/domain/permitted-model.entity';
import { PermittedModelsRepository } from 'src/domain/models/application/ports/permitted-models.repository';
import { UserDefaultModelsRepository } from 'src/domain/models/application/ports/user-default-models.repository';
import {
  ModelError,
  PermittedModelNotFoundError,
} from 'src/domain/models/application/models.errors';
import { ContextService } from 'src/common/context/services/context.service';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';

@Injectable()
export class SetUserDefaultLanguageModelUseCase {
  private readonly logger = new Logger(SetUserDefaultLanguageModelUseCase.name);

  constructor(
    private readonly permittedModelsRepository: PermittedModelsRepository,
    private readonly userDefaultModelsRepository: UserDefaultModelsRepository,
    private readonly contextService: ContextService,
  ) {}

  async execute(
    command: SetUserDefaultLanguageModelCommand,
  ): Promise<PermittedLanguageModel> {
    this.logger.log(
      {
        userId: command.userId,
        permittedModelId: command.permittedModelId,
        orgId: command.orgId,
      },
      'execute',
    );
    try {
      return await this.setDefault(command);
    } catch (error) {
      if (error instanceof ModelError) throw error;
      this.logger.error(
        {
          userId: command.userId,
          permittedModelId: command.permittedModelId,
          orgId: command.orgId,
          err: error instanceof Error ? error : new Error('Unknown error'),
        },
        'Failed to set user default model',
      );
      throw error;
    }
  }

  private async setDefault(
    command: SetUserDefaultLanguageModelCommand,
  ): Promise<PermittedLanguageModel> {
    if (this.contextService.get('userId') !== command.userId) {
      throw new UnauthorizedAccessError();
    }
    const permittedModel = await this.findPermittedModel(command);
    const existingDefault = await this.userDefaultModelsRepository.findByUserId(
      command.userId,
    );
    const action = existingDefault ? 'updating' : 'setting';
    this.logger.debug(
      {
        modelName: permittedModel.model.name,
        modelProvider: permittedModel.model.provider,
        existingDefaultId: existingDefault?.id,
        action,
      },
      'Permitted model found for user default',
    );
    const result = await this.userDefaultModelsRepository.setAsDefault(
      permittedModel,
      command.userId,
    );
    this.logger.debug(
      { userId: command.userId, modelId: result.id, action },
      'User default model changed successfully',
    );
    return result;
  }

  private async findPermittedModel(
    command: SetUserDefaultLanguageModelCommand,
  ): Promise<PermittedLanguageModel> {
    const model = await this.permittedModelsRepository.findOneLanguage({
      id: command.permittedModelId,
    });
    if (model) return model;
    this.logger.error(
      { permittedModelId: command.permittedModelId, orgId: command.orgId },
      'Permitted model not found',
    );
    throw new PermittedModelNotFoundError(command.permittedModelId);
  }
}
