import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { ImageGenerationModel } from 'src/domain/models/domain/models/image-generation.model';
import {
  ModelNotFoundByIdError,
  UnexpectedModelError,
} from '../../models.errors';
import { ModelsRepository } from '../../ports/models.repository';
import { ModelPolicyService } from '../../services/model-policy.service';
import { UpdateImageGenerationModelCommand } from './update-image-generation-model.command';

@Injectable()
export class UpdateImageGenerationModelUseCase {
  private readonly logger = new Logger(UpdateImageGenerationModelUseCase.name);

  constructor(
    private readonly modelsRepository: ModelsRepository,
    private readonly modelPolicy: ModelPolicyService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedModelError)
  async execute(
    command: UpdateImageGenerationModelCommand,
  ): Promise<ImageGenerationModel> {
    this.logger.log('execute', {
      id: command.id,
    });

    this.modelPolicy.assertSupportedImageGenerationProvider(command.provider);

    const existingModel = await this.modelsRepository.findOneImageGeneration(
      command.id,
    );

    if (!existingModel) {
      throw new ModelNotFoundByIdError(command.id);
    }

    const model = new ImageGenerationModel({
      id: command.id,
      name: command.name,
      provider: command.provider,
      displayName: command.displayName,
      isArchived: command.isArchived,
      createdAt: existingModel.createdAt,
      inputTokenCost: command.inputTokenCost,
      outputTokenCost: command.outputTokenCost,
    });
    await this.modelsRepository.save(model);

    return model;
  }
}
