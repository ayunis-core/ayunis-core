import { Injectable } from '@nestjs/common';
import { BaseUseCase } from 'src/common/use-case/base-use-case';
import { ApplicationError } from 'src/common/errors/base.error';
import { ImageGenerationModel } from 'src/domain/models/domain/models/image-generation.model';
import {
  ModelNotFoundByIdError,
  UnexpectedModelError,
} from '../../models.errors';
import { ModelsRepository } from '../../ports/models.repository';
import { ModelPolicyService } from '../../services/model-policy.service';
import { UpdateImageGenerationModelCommand } from './update-image-generation-model.command';

@Injectable()
export class UpdateImageGenerationModelUseCase extends BaseUseCase {
  constructor(
    private readonly modelsRepository: ModelsRepository,
    private readonly modelPolicy: ModelPolicyService,
  ) {
    super();
  }

  async execute(
    command: UpdateImageGenerationModelCommand,
  ): Promise<ImageGenerationModel> {
    try {
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
    } catch (error) {
      if (error instanceof ApplicationError) {
        throw error;
      }
      this.logger.error('Unexpected error updating image-generation model', {
        error: error as Error,
      });
      throw new UnexpectedModelError(error as Error);
    }
  }
}
