import { Injectable } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { IsEmbeddingModelEnabledQuery } from './is-embedding-model-enabled.query';
import { PermittedModelsRepository } from '../../ports/permitted-models.repository';
import { UnexpectedModelError } from '../../models.errors';

@Injectable()
export class IsEmbeddingModelEnabledUseCase {
  constructor(
    private readonly permittedModelsRepository: PermittedModelsRepository,
  ) {}

  @HandleUnexpectedErrors(UnexpectedModelError)
  async execute(query: IsEmbeddingModelEnabledQuery): Promise<boolean> {
    const model = await this.permittedModelsRepository.findOneEmbedding(
      query.orgId,
    );
    return model !== null;
  }
}
