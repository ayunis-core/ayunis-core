import { CreateLanguageModelCommand } from './create-language-model.command';

import { ModelsRepository } from 'src/domain/models/application/ports/models.repository';
import { LanguageModel } from 'src/domain/models/domain/models/language.model';
import {
  ModelAlreadyExistsError,
  UnexpectedModelError,
} from 'src/domain/models/application/models.errors';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class CreateLanguageModelUseCase {
  private readonly logger = new Logger(CreateLanguageModelUseCase.name);

  constructor(private readonly modelsRepository: ModelsRepository) {}

  @HandleUnexpectedErrors(UnexpectedModelError)
  async execute(command: CreateLanguageModelCommand): Promise<LanguageModel> {
    this.logger.log(
      { modelName: command.name, provider: command.provider },
      'Creating language model',
    );

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
      canUseTools: command.canUseTools,
      isReasoning: command.isReasoning,
      canVision: command.canVision,
      contextWindowSize: command.contextWindowSize,
      isArchived: command.isArchived,
      hasProviderFault: command.hasProviderFault,
      inputTokenCost: command.inputTokenCost,
      outputTokenCost: command.outputTokenCost,
      tier: command.tier,
      description: command.description,
    });
    await this.modelsRepository.save(model);
    return model;
  }
}
