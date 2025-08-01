import { CreateLanguageModelCommand } from './create-language-model.command';

import { ModelsRepository } from '../../ports/models.repository';
import { LanguageModel } from 'src/domain/models/domain/models/language.model';
import {
  ModelAlreadyExistsError,
  UnexpectedModelError,
} from '../../models.errors';
import { ApplicationError } from 'src/common/errors/base.error';

export class CreateLanguageModelUseCase {
  constructor(private readonly modelsRepository: ModelsRepository) {}

  async execute(command: CreateLanguageModelCommand): Promise<LanguageModel> {
    try {
      const existingModel = await this.modelsRepository.findOne({
        name: command.name,
        provider: command.provider,
      });

      if (existingModel) {
        throw new ModelAlreadyExistsError(command.name, command.provider);
      }

      const model = new LanguageModel({
        name: command.name,
        provider: command.provider,
        displayName: command.displayName,
        canStream: command.canStream,
        isReasoning: command.isReasoning,
        isArchived: command.isArchived,
      });
      await this.modelsRepository.save(model);
      return model;
    } catch (error) {
      if (error instanceof ApplicationError) {
        throw error;
      }
      throw new UnexpectedModelError(error as Error);
    }
  }
}
