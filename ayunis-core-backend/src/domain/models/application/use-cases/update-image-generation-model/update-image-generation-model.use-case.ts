import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
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
export class UpdateImageGenerationModelUseCase {
  constructor(
    @InjectPinoLogger(UpdateImageGenerationModelUseCase.name)
    private readonly logger: PinoLogger,

    private readonly modelsRepository: ModelsRepository,
    private readonly modelPolicy: ModelPolicyService,
  ) {}

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
      this.logger.error(
        {
          err: error as Error,
        },
        'Unexpected error updating image-generation model',
      );
      throw new UnexpectedModelError(error as Error);
    }
  }
}
