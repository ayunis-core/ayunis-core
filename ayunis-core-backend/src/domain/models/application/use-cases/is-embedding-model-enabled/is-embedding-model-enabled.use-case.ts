import { Injectable } from '@nestjs/common';
import { IsEmbeddingModelEnabledQuery } from './is-embedding-model-enabled.query';
import { PermittedModelsRepository } from '../../ports/permitted-models.repository';

@Injectable()
export class IsEmbeddingModelEnabledUseCase {
  constructor(
    private readonly permittedModelsRepository: PermittedModelsRepository,
  ) {}

  async execute(query: IsEmbeddingModelEnabledQuery): Promise<boolean> {
    const model = await this.permittedModelsRepository.findOneEmbedding(
      query.orgId,
    );
    return model !== null;
  }
}
