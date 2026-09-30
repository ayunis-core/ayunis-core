import { Injectable, Logger } from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { UnexpectedIndexError } from 'src/domain/rag/indexers/application/indexer.errors';
import { ParentChildIndexerRepositoryPort } from 'src/domain/rag/indexers/infrastructure/adapters/parent-child-index/application/ports/parent-child-indexer-repository.port';
import { PreparedParentChildContent } from 'src/domain/rag/indexers/infrastructure/adapters/parent-child-index/domain/prepared-parent-child-content.entity';

@Injectable()
export class ReplaceContentUseCase {
  private readonly logger = new Logger(ReplaceContentUseCase.name);

  constructor(
    private readonly parentChildIndexerRepository: ParentChildIndexerRepositoryPort,
  ) {}

  @HandleUnexpectedErrors(UnexpectedIndexError)
  @Transactional()
  async execute(prepared: PreparedParentChildContent): Promise<void> {
    this.logger.debug(
      {
        documentId: prepared.documentId,
        parentChunkCount: prepared.parentChunks.length,
      },
      'Replacing parent-child entries',
    );
    await this.parentChildIndexerRepository.delete(prepared.documentId);
    await this.parentChildIndexerRepository.saveMany(prepared.parentChunks);
  }
}
