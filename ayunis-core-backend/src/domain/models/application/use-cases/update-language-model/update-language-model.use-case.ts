import { UpdateLanguageModelCommand } from './update-language-model.command';
import { ModelsRepository } from '../../ports/models.repository';
import { LanguageModel } from 'src/domain/models/domain/models/language.model';
import {
  ModelNotFoundByIdError,
  UnexpectedModelError,
} from '../../models.errors';
import { ApplicationError } from 'src/common/errors/base.error';
import { Injectable, Logger } from '@nestjs/common';
import { ClearDefaultsByCatalogModelIdUseCase } from '../clear-defaults-by-catalog-model-id/clear-defaults-by-catalog-model-id.use-case';
import { ClearDefaultsByCatalogModelIdCommand } from '../clear-defaults-by-catalog-model-id/clear-defaults-by-catalog-model-id.command';

@Injectable()
export class UpdateLanguageModelUseCase {
  private readonly logger = new Logger(UpdateLanguageModelUseCase.name);

  constructor(
    private readonly modelsRepository: ModelsRepository,
    private readonly clearDefaultsUseCase: ClearDefaultsByCatalogModelIdUseCase,
  ) {}

  async execute(command: UpdateLanguageModelCommand): Promise<LanguageModel> {
    try {
      const existingModel = await this.modelsRepository.findOne({
        id: command.id,
      });

      if (!existingModel) {
        throw new ModelNotFoundByIdError(command.id);
      }

      // Check if model is being archived (isArchived: false -> true)
      const isBeingArchived = !existingModel.isArchived && command.isArchived;

      const model = new LanguageModel({
        id: command.id,
        name: command.name,
        provider: command.provider,
        displayName: command.displayName,
        isArchived: command.isArchived,
        canStream: command.canStream,
        canUseTools: command.canUseTools,
        isReasoning: command.isReasoning,
        canVision: command.canVision,
        inputTokenCost: command.inputTokenCost,
        outputTokenCost: command.outputTokenCost,
        currency: command.currency,
      });
      await this.modelsRepository.save(model);

      // Clear defaults if model is being archived
      if (isBeingArchived) {
        this.logger.log('Model is being archived, clearing defaults', {
          modelId: command.id,
        });
        await this.clearDefaultsUseCase.execute(
          new ClearDefaultsByCatalogModelIdCommand(command.id),
        );
      }

      return model;
    } catch (error) {
      if (error instanceof ApplicationError) {
        throw error;
      }
      throw new UnexpectedModelError(error as Error);
    }
  }
}
