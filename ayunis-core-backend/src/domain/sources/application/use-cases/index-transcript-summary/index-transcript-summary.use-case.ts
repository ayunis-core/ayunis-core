import { Injectable, Logger } from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { IngestBulkContentCommand } from 'src/domain/rag/indexers/application/use-cases/ingest-bulk-content/ingest-bulk-content.command';
import { IngestBulkContentUseCase } from 'src/domain/rag/indexers/application/use-cases/ingest-bulk-content/ingest-bulk-content.use-case';
import { IndexType } from 'src/domain/rag/indexers/domain/value-objects/index-type.enum';
import { SplitTextCommand } from 'src/domain/rag/splitters/application/use-cases/split-text/split-text.command';
import { SplitTextUseCase } from 'src/domain/rag/splitters/application/use-cases/split-text/split-text.use-case';
import { SplitterType } from 'src/domain/rag/splitters/domain/splitter-type.enum';
import { SourceTranscriptRepository } from 'src/domain/sources/application/ports/source-transcript.repository';
import { UnexpectedSourceError } from 'src/domain/sources/application/sources.errors';
import {
  TRANSCRIPT_SUMMARY_CHUNK_KIND,
  type TranscriptSummaryChunkMeta,
} from 'src/domain/sources/application/util/transcript-chunks';
import { TextSourceContentChunk } from 'src/domain/sources/domain/source-content-chunk.entity';
import { IndexTranscriptSummaryCommand } from './index-transcript-summary.command';

/**
 * Makes a transcript's summary searchable under the transcript's source, in
 * chunks marked as summary (`TRANSCRIPT_SUMMARY_CHUNK_KIND`). A transcript is
 * summarized once: when it already has summary chunks nothing is added, so a
 * retried job does not index it twice. Chunks and index entries are written
 * in one transaction holding the source's row lock, so a deleted source gets
 * neither. Returns false when the source is gone or not READY.
 */
@Injectable()
export class IndexTranscriptSummaryUseCase {
  private readonly logger = new Logger(IndexTranscriptSummaryUseCase.name);

  constructor(
    private readonly transcripts: SourceTranscriptRepository,
    private readonly splitText: SplitTextUseCase,
    private readonly ingestBulkContent: IngestBulkContentUseCase,
  ) {}

  @HandleUnexpectedErrors(UnexpectedSourceError)
  async execute(command: IndexTranscriptSummaryCommand): Promise<boolean> {
    this.logger.log(
      { sourceId: command.sourceId },
      'Indexing transcript summary',
    );
    return this.index(command, this.summaryChunks(command.summary));
  }

  @Transactional()
  private async index(
    { sourceId, orgId }: IndexTranscriptSummaryCommand,
    chunks: TextSourceContentChunk[],
  ): Promise<boolean> {
    const outcome = await this.transcripts.addSummaryChunks(sourceId, chunks);
    if (outcome === 'source_gone') return false;
    if (outcome === 'added') {
      await this.ingestBulkContent.execute(
        new IngestBulkContentCommand({
          orgId,
          entries: chunks.map((chunk) => ({
            documentId: sourceId,
            chunkId: chunk.id,
            content: chunk.content,
          })),
          type: IndexType.PARENT_CHILD,
        }),
      );
    }
    return true;
  }

  private summaryChunks(summary: string): TextSourceContentChunk[] {
    const meta: TranscriptSummaryChunkMeta = {
      kind: TRANSCRIPT_SUMMARY_CHUNK_KIND,
    };
    return this.splitText
      .execute(
        new SplitTextCommand(summary, SplitterType.RECURSIVE, {
          chunkSize: 2000,
          chunkOverlap: 200,
        }),
      )
      .chunks.map(
        (chunk) => new TextSourceContentChunk({ content: chunk.text, meta }),
      );
  }
}
