import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { ApplicationError } from 'src/common/errors/base.error';
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
  constructor(
    @InjectPinoLogger(CreateImageGenerationModelUseCase.name)
    private readonly logger: PinoLogger,

    private readonly modelsRepository: ModelsRepository,
    private readonly modelPolicy: ModelPolicyService,
  ) {}

  async execute(
    command: CreateImageGenerationModelCommand,
  ): Promise<ImageGenerationModel> {
    try {
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
    } catch (error) {
      if (error instanceof ApplicationError) {
        throw error;
      }
      this.logger.error(
        {
          err: error as Error,
        },
        'Unexpected error creating image-generation model',
      );
      throw new UnexpectedModelError(error as Error);
    }
  }
}
