import { UpdateLanguageModelCommand } from './update-language-model.command';
import { ModelsRepository } from '../../ports/models.repository';
import { LanguageModel } from 'src/domain/models/domain/models/language.model';
import {
  ModelAlreadyExistsError,
  ModelNotFoundByIdError,
  UnexpectedModelError,
} from '../../models.errors';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
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

  @HandleUnexpectedErrors(UnexpectedModelError)
  async execute(command: UpdateLanguageModelCommand): Promise<LanguageModel> {
    this.logger.log('Updating language model', { modelId: command.id });

    const existingModel = await this.modelsRepository.findOne({
      id: command.id,
    });
    if (!existingModel) {
      throw new ModelNotFoundByIdError(command.id);
    }

    const modelWithSameKey = await this.modelsRepository.findOne({
      name: command.name,
      provider: command.provider,
    });
    if (modelWithSameKey && modelWithSameKey.id !== command.id) {
      throw new ModelAlreadyExistsError(command.name, command.provider);
    }

    const isBeingArchived = !existingModel.isArchived && command.isArchived;
    const model = this.createModel(command);
    await this.modelsRepository.save(model);

    if (isBeingArchived) {
      this.logger.log('Model is being archived, clearing defaults', {
        modelId: command.id,
      });
      await this.clearDefaultsUseCase.execute(
        new ClearDefaultsByCatalogModelIdCommand(command.id),
      );
    }

    return model;
  }

  private createModel(command: UpdateLanguageModelCommand): LanguageModel {
    return new LanguageModel({
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
      tier: command.tier,
      description: command.description,
    });
  }
}
