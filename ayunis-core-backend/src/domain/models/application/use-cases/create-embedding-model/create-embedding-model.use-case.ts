import { CreateEmbeddingModelCommand } from './create-embedding-model.command';
import { ModelsRepository } from '../../ports/models.repository';
import { EmbeddingModel } from 'src/domain/models/domain/models/embedding.model';
import {
  ModelAlreadyExistsError,
  UnexpectedModelError,
} from '../../models.errors';
import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';

@Injectable()
export class CreateEmbeddingModelUseCase {
  constructor(
    @InjectPinoLogger(CreateEmbeddingModelUseCase.name)
    private readonly logger: PinoLogger,
    private readonly modelsRepository: ModelsRepository,
  ) {}

  @HandleUnexpectedErrors(UnexpectedModelError)
  async execute(command: CreateEmbeddingModelCommand): Promise<EmbeddingModel> {
    this.logger.info(
      {
        name: command.name,
        provider: command.provider,
      },
      'Creating embedding model',
    );

    const existingModel = await this.modelsRepository.findOne({
      name: command.name,
      provider: command.provider,
    });

    if (existingModel) {
      this.logger.warn(
        {
          name: command.name,
          provider: command.provider,
        },
        'Embedding model already exists',
      );
      throw new ModelAlreadyExistsError(command.name, command.provider);
    }

    const model = new EmbeddingModel({ ...command });
    await this.modelsRepository.save(model);
    return model;
  }
}
