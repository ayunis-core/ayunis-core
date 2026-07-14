import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { ImageGenerationModel } from 'src/domain/models/domain/models/image-generation.model';
import { ModelsRepository } from '../../ports/models.repository';
import {
  ModelAlreadyExistsError,
  UnexpectedModelError,
} from '../../models.errors';
import { ModelPolicyService } from '../../services/model-policy.service';
import { CreateImageGenerationModelCommand } from './create-image-generation-model.command';

@Injectable()
export class CreateImageGenerationModelUseCase {
  private readonly logger = new Logger(CreateImageGenerationModelUseCase.name);

  constructor(
    private readonly modelsRepository: ModelsRepository,
    private readonly modelPolicy: ModelPolicyService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedModelError)
  async execute(
    command: CreateImageGenerationModelCommand,
  ): Promise<ImageGenerationModel> {
    this.logger.log('execute', {
      name: command.name,
      provider: command.provider,
    });

    this.modelPolicy.assertSupportedImageGenerationProvider(command.provider);

    const existingModel = await this.modelsRepository.findOne({
      name: command.name,
      provider: command.provider,
    });

    if (existingModel) {
      throw new ModelAlreadyExistsError(command.name, command.provider);
    }

    const model = new ImageGenerationModel({
      name: command.name,
      provider: command.provider,
      displayName: command.displayName,
      isArchived: command.isArchived,
      inputTokenCost: command.inputTokenCost,
      outputTokenCost: command.outputTokenCost,
    });
    await this.modelsRepository.save(model);
    return model;
  }
}
