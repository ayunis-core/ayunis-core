import { UpdateLanguageModelCommand } from './update-language-model.command';
import { ModelsRepository } from '../../ports/models.repository';
import { LanguageModel } from 'src/domain/models/domain/models/language.model';
import {
  ModelNotFoundByIdError,
  UnexpectedModelError,
} from '../../models.errors';
import { ApplicationError } from 'src/common/errors/base.error';

export class UpdateLanguageModelUseCase {
  constructor(private readonly modelsRepository: ModelsRepository) {}

  async execute(command: UpdateLanguageModelCommand): Promise<LanguageModel> {
    try {
      const existingModel = await this.modelsRepository.findOne({
        id: command.id,
      });

      if (!existingModel) {
        throw new ModelNotFoundByIdError(command.id);
      }

      const model = new LanguageModel({
        id: command.id,
        name: command.name,
        provider: command.provider,
        displayName: command.displayName,
        isArchived: command.isArchived,
        canStream: command.canStream,
        isReasoning: command.isReasoning,
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
