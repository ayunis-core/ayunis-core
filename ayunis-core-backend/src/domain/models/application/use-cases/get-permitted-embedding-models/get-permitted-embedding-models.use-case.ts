import { PermittedEmbeddingModel } from 'src/domain/models/domain/permitted-model.entity';
import { PermittedModelsRepository } from '../../ports/permitted-models.repository';
import { GetPermittedEmbeddingModelsQuery } from './get-permitted-embedding-models.query';
import { Logger } from '@nestjs/common';
import { ApplicationError } from 'src/common/errors/base.error';
import { UnexpectedModelError } from '../../models.errors';

export class GetPermittedEmbeddingModelsUseCase {
  private readonly logger = new Logger(GetPermittedEmbeddingModelsUseCase.name);

  constructor(
    private readonly permittedModelsRepository: PermittedModelsRepository,
  ) {}

  async execute(
    query: GetPermittedEmbeddingModelsQuery,
  ): Promise<PermittedEmbeddingModel[]> {
    this.logger.log('Executing get permitted embedding models', {
      orgId: query.orgId,
    });
    try {
      return this.permittedModelsRepository.findManyEmbedding(query.orgId);
    } catch (error) {
      if (error instanceof ApplicationError) {
        throw error;
      }
      this.logger.error('Error getting permitted embedding models', {
        orgId: query.orgId,
        error: error instanceof Error ? error : new Error('Unknown error'),
      });
      throw new UnexpectedModelError(error as Error);
    }
  }
}
