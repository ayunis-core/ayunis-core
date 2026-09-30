import { Injectable } from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';
import type { UUID } from 'crypto';
import { PrepareBulkContentUseCase } from 'src/domain/rag/indexers/application/use-cases/prepare-bulk-content/prepare-bulk-content.use-case';
import { PrepareBulkContentCommand } from 'src/domain/rag/indexers/application/use-cases/prepare-bulk-content/prepare-bulk-content.command';
import { ReplaceBulkContentUseCase } from 'src/domain/rag/indexers/application/use-cases/replace-bulk-content/replace-bulk-content.use-case';
import { ReplaceBulkContentCommand } from 'src/domain/rag/indexers/application/use-cases/replace-bulk-content/replace-bulk-content.command';
import { IndexType } from 'src/domain/rag/indexers/domain/value-objects/index-type.enum';
import { SourceRepository } from 'src/domain/sources/application/ports/source.repository';
import type { PreparedTextSourceContent } from 'src/domain/sources/application/models/prepared-text-source-content';
import type { TextSourceContentChunk } from 'src/domain/sources/domain/source-content-chunk.entity';
import type { TextSource } from 'src/domain/sources/domain/sources/text-source.entity';

/**
 * Replaces a text source's processed content in two phases: `prepare` makes
 * the embedding provider calls with no transaction open, and `commit` swaps
 * text, chunks and index entries in one transaction, so a failure at any
 * point leaves the previously committed content untouched.
 */
@Injectable()
export class SourceContentReplacementService {
  constructor(
    private readonly sourceRepository: SourceRepository,
    private readonly prepareBulkContentUseCase: PrepareBulkContentUseCase,
    private readonly replaceBulkContentUseCase: ReplaceBulkContentUseCase,
  ) {}

  async prepare(params: {
    sourceId: UUID;
    orgId: UUID;
    text: string;
    chunks: TextSourceContentChunk[];
  }): Promise<PreparedTextSourceContent> {
    const index = await this.prepareBulkContentUseCase.execute(
      new PrepareBulkContentCommand({
        orgId: params.orgId,
        documentId: params.sourceId,
        entries: params.chunks.map((chunk) => ({
          chunkId: chunk.id,
          content: chunk.content,
        })),
        type: IndexType.PARENT_CHILD,
      }),
    );
    return { text: params.text, chunks: params.chunks, index };
  }

  /** Returns null and writes nothing when the source no longer exists. */
  @Transactional()
  async commit(
    source: TextSource,
    content: PreparedTextSourceContent,
  ): Promise<TextSource | null> {
    if (content.index.documentId !== source.id) {
      throw new Error(
        `Content for source ${source.id} was prepared for source ${content.index.documentId}`,
      );
    }
    const saved = await this.sourceRepository.replaceTextSource(source, {
      text: content.text,
      chunks: content.chunks,
    });
    if (!saved) return null;
    await this.replaceBulkContentUseCase.execute(
      new ReplaceBulkContentCommand({ prepared: content.index }),
    );
    return saved;
  }
}
