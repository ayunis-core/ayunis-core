import { CreateLanguageModelCommand } from './create-language-model.command';

import { ModelsRepository } from '../../ports/models.repository';
import { LanguageModel } from 'src/domain/models/domain/models/language.model';
import {
  ModelAlreadyExistsError,
  UnexpectedModelError,
} from '../../models.errors';
import { Injectable } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';

@Injectable()
export class CreateLanguageModelUseCase {
  constructor(private readonly modelsRepository: ModelsRepository) {}

  @HandleUnexpectedErrors(UnexpectedModelError)
  async execute(command: CreateLanguageModelCommand): Promise<LanguageModel> {
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
      isArchived: command.isArchived,
      inputTokenCost: command.inputTokenCost,
      outputTokenCost: command.outputTokenCost,
      tier: command.tier,
    });
    await this.modelsRepository.save(model);
    return model;
  }
}
