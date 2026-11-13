import { PreparedContentEmbeddings } from 'src/domain/rag/indexers/application/models/prepared-content-embeddings';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { UnexpectedIndexError } from 'src/domain/rag/indexers/application/indexer.errors';
import { Injectable } from '@nestjs/common';
import { GetPermittedEmbeddingModelUseCase } from 'src/domain/models/application/use-cases/get-permitted-embedding-model/get-permitted-embedding-model.use-case';
import { GetPermittedEmbeddingModelQuery } from 'src/domain/models/application/use-cases/get-permitted-embedding-model/get-permitted-embedding-model.query';
import { ChildChunkEmbedder } from 'src/domain/rag/indexers/infrastructure/adapters/parent-child-index/application/services/child-chunk-embedder.service';
import { PrepareEmbeddingsCommand } from './prepare-embeddings.command';

/**
 * Embeds the child texts of parent chunks before they are ingested, so a
 * later ingestion that passes the result along only embeds what is missing.
 * Stores nothing.
 */
@Injectable()
export class PrepareEmbeddingsUseCase {
  constructor(
    private readonly embedder: ChildChunkEmbedder,
    private readonly getPermittedEmbeddingModelUseCase: GetPermittedEmbeddingModelUseCase,
  ) {}

  @HandleUnexpectedErrors(UnexpectedIndexError)
  async execute(
    command: PrepareEmbeddingsCommand,
  ): Promise<PreparedContentEmbeddings | undefined> {
    const texts = command.contents.flatMap((content) =>
      this.embedder.childTexts(content),
    );
    if (texts.length === 0) return undefined;

    const permittedModel = await this.getPermittedEmbeddingModelUseCase.execute(
      new GetPermittedEmbeddingModelQuery({ orgId: command.orgId }),
    );
    const vectors = await this.embedder.embed(
      texts,
      permittedModel.model,
      command.orgId,
    );
    return new PreparedContentEmbeddings(
      permittedModel.model,
      new Map(texts.map((text, index) => [text, vectors[index]])),
    );
  }
}
