import { Injectable } from '@nestjs/common';
import type { UUID } from 'crypto';
import { GetPermittedEmbeddingModelUseCase } from 'src/domain/models/application/use-cases/get-permitted-embedding-model/get-permitted-embedding-model.use-case';
import { GetPermittedEmbeddingModelQuery } from 'src/domain/models/application/use-cases/get-permitted-embedding-model/get-permitted-embedding-model.query';
import { AssertEmbeddingsProviderAvailableUseCase } from 'src/domain/rag/embeddings/application/use-cases/assert-embeddings-provider-available/assert-embeddings-provider-available.use-case';
import { AssertEmbeddingsProviderAvailableQuery } from 'src/domain/rag/embeddings/application/use-cases/assert-embeddings-provider-available/assert-embeddings-provider-available.query';

/**
 * Indexing resolves the org's embedding model only inside the worker, after
 * the expensive extraction. Document uploads check here first, so an org
 * without a usable embedding model is rejected before any transfer or job.
 */
@Injectable()
export class EmbeddingReadinessService {
  constructor(
    private readonly getPermittedEmbeddingModel: GetPermittedEmbeddingModelUseCase,
    private readonly assertEmbeddingsProviderAvailable: AssertEmbeddingsProviderAvailableUseCase,
  ) {}

  async assertOrgCanEmbed(orgId: UUID): Promise<void> {
    const permitted = await this.getPermittedEmbeddingModel.execute(
      new GetPermittedEmbeddingModelQuery({ orgId }),
    );
    await this.assertEmbeddingsProviderAvailable.execute(
      new AssertEmbeddingsProviderAvailableQuery({
        provider: permitted.model.provider,
      }),
    );
  }
}
