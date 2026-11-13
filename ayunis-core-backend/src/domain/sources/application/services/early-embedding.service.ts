import { Injectable, Logger } from '@nestjs/common';
import type { UUID } from 'crypto';
import { ingestionEarlyEmbedding } from 'src/config/ingestion.config';
import { PrepareContentEmbeddingsUseCase } from 'src/domain/rag/indexers/application/use-cases/prepare-content-embeddings/prepare-content-embeddings.use-case';
import { PrepareContentEmbeddingsCommand } from 'src/domain/rag/indexers/application/use-cases/prepare-content-embeddings/prepare-content-embeddings.command';
import { IndexType } from 'src/domain/rag/indexers/domain/value-objects/index-type.enum';
import { SplitTextUseCase } from 'src/domain/rag/splitters/application/use-cases/split-text/split-text.use-case';
import { SplitTextCommand } from 'src/domain/rag/splitters/application/use-cases/split-text/split-text.command';
import { SplitterType } from 'src/domain/rag/splitters/domain/splitter-type.enum';
import { SOURCE_CHUNKING } from 'src/domain/sources/application/util/source-chunking.helper';
import type { PreparedContentEmbeddings } from 'src/domain/rag/indexers/application/models/prepared-content-embeddings';

export interface EarlyEmbeddingSession {
  appendPages(texts: readonly string[]): void;
  /**
   * Stops, waits for the requests already sent and returns their vectors by
   * embedded text. Never rejects: what is missing is embedded by the
   * ingestion that receives the result.
   */
  finish(): Promise<PreparedContentEmbeddings | undefined>;
}

/**
 * The chunks and their vectors still come from the finished text, cut as
 * before; this only computes vectors ahead of time. The splitter works from
 * the start of the text, so once a blank line fixes its top-level separator,
 * every chunk but the last one cut from the pages read so far is already a
 * chunk of the finished text (AYC-1813). A chunk that turns out different is
 * simply embedded at the end.
 */
@Injectable()
export class EarlyEmbeddingService {
  private readonly logger = new Logger(EarlyEmbeddingService.name);
  private readonly enabled = ingestionEarlyEmbedding();

  constructor(
    private readonly splitTextUseCase: SplitTextUseCase,
    private readonly prepareContentEmbeddingsUseCase: PrepareContentEmbeddingsUseCase,
  ) {}

  start(orgId: UUID): EarlyEmbeddingSession {
    const pages: string[] = [];
    let precomputedEmbeddings: PreparedContentEmbeddings | undefined;
    const pendingRequests: Promise<void>[] = [];
    let submittedChunkCount = 0;
    let acceptingPages = this.enabled;

    const embed = async (contents: string[]): Promise<void> => {
      try {
        const prepared = await this.prepareContentEmbeddingsUseCase.execute(
          new PrepareContentEmbeddingsCommand({
            orgId,
            contents,
            type: IndexType.PARENT_CHILD,
          }),
        );
        if (prepared) {
          precomputedEmbeddings =
            precomputedEmbeddings?.merge(prepared) ?? prepared;
        }
      } catch (error) {
        acceptingPages = false;
        this.logger.warn(
          { err: error as Error },
          'Embedding ahead of extraction failed; the rest is embedded at the end',
        );
      }
    };

    return {
      appendPages: (texts) => {
        if (!acceptingPages) return;
        pages.push(...texts);
        const stable = this.stableChunks(pages.join('\n'));
        if (stable.length <= submittedChunkCount) return;
        pendingRequests.push(embed(stable.slice(submittedChunkCount)));
        submittedChunkCount = stable.length;
      },
      finish: async () => {
        acceptingPages = false;
        await Promise.all(pendingRequests);
        return precomputedEmbeddings;
      },
    };
  }

  private stableChunks(text: string): string[] {
    if (!text.includes('\n\n')) return [];
    return this.splitTextUseCase
      .execute(
        new SplitTextCommand(text, SplitterType.RECURSIVE, SOURCE_CHUNKING),
      )
      .chunks.slice(0, -1)
      .map((chunk) => chunk.text);
  }
}
