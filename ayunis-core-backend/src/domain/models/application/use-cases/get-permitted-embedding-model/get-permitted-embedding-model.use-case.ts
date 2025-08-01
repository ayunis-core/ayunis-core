import { PermittedEmbeddingModel } from 'src/domain/models/domain/permitted-model.entity';
import { PermittedModelsRepository } from '../../ports/permitted-models.repository';
import { GetPermittedEmbeddingModelQuery } from './get-permitted-embedding-model.query';
import {
  ModelNotFoundByIdError,
  UnexpectedModelError,
} from '../../models.errors';
import { ApplicationError } from 'src/common/errors/base.error';

export class GetPermittedEmbeddingModelUseCase {
  constructor(
    private readonly permittedModelsRepository: PermittedModelsRepository,
  ) {}

  async execute(
    query: GetPermittedEmbeddingModelQuery,
  ): Promise<PermittedEmbeddingModel> {
    try {
      const model =
        await this.permittedModelsRepository.findOneEmbedding(query);
      if (!model || !(model instanceof PermittedEmbeddingModel)) {
        throw new ModelNotFoundByIdError(query.id);
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
