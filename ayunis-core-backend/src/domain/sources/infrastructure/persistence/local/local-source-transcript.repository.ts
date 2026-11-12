import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { TransactionHost } from '@nestjs-cls/transactional';
import type { TransactionalAdapterTypeOrm } from '@nestjs-cls/transactional-adapter-typeorm';
import { randomUUID, type UUID } from 'crypto';
import { Repository, type EntityManager } from 'typeorm';
import {
  SourceTranscriptRepository,
  type SummaryChunksOutcome,
} from 'src/domain/sources/application/ports/source-transcript.repository';
import { TRANSCRIPT_SUMMARY_CHUNK_KIND } from 'src/domain/sources/application/util/transcript-chunks';
import type { TextSourceContentChunk } from 'src/domain/sources/domain/source-content-chunk.entity';
import { SourceStatus } from 'src/domain/sources/domain/source-status.enum';
import type { TranscriptSegment } from 'src/domain/transcriptions/domain/recording-transcript';
import { SourceTranscriptSegmentRecord } from './schema/source-transcript-segment.record';

// Keeps one INSERT well below PostgreSQL's 65,535 bind parameters.
const INSERT_BATCH_SIZE = 1000;

@Injectable()
export class LocalSourceTranscriptRepository extends SourceTranscriptRepository {
  constructor(
    @InjectRepository(SourceTranscriptSegmentRecord)
    private readonly defaultRepository: Repository<SourceTranscriptSegmentRecord>,
    private readonly txHost: TransactionHost<TransactionalAdapterTypeOrm>,
  ) {
    super();
  }

  private get repository(): Repository<SourceTranscriptSegmentRecord> {
    const transactionManager = this.txHost.tx as EntityManager | undefined;
    return (
      transactionManager?.getRepository(SourceTranscriptSegmentRecord) ??
      this.defaultRepository
    );
  }

  async replace(sourceId: UUID, segments: TranscriptSegment[]): Promise<void> {
    await this.repository.delete({ sourceId });
    const records = segments.map((segment, position) =>
      this.repository.create({
        id: randomUUID(),
        sourceId,
        position,
        startSeconds: segment.start,
        endSeconds: segment.end,
        speaker: segment.speakerId ?? null,
        text: segment.text,
      }),
    );
    for (let index = 0; index < records.length; index += INSERT_BATCH_SIZE) {
      await this.repository.insert(
        records.slice(index, index + INSERT_BATCH_SIZE),
      );
    }
  }

  async findBySourceId(sourceId: UUID): Promise<TranscriptSegment[]> {
    const records = await this.repository.find({
      where: { sourceId },
      order: { position: 'ASC' },
    });
    return records.map((record) => ({
      text: record.text,
      start: record.startSeconds,
      end: record.endSeconds,
      ...(record.speaker !== null && { speakerId: record.speaker }),
    }));
  }

  async addSummaryChunks(
    sourceId: UUID,
    chunks: TextSourceContentChunk[],
  ): Promise<SummaryChunksOutcome> {
    const { manager } = this.repository;
    const ready: unknown[] = await manager.query(
      'SELECT 1 FROM sources WHERE id = $1 AND status = $2 FOR UPDATE',
      [sourceId, SourceStatus.READY],
    );
    if (ready.length === 0) return 'source_gone';
    const summarized: unknown[] = await manager.query(
      `SELECT 1 FROM source_content_chunks
       WHERE "sourceId" = $1 AND meta->>'kind' = $2 LIMIT 1`,
      [sourceId, TRANSCRIPT_SUMMARY_CHUNK_KIND],
    );
    if (summarized.length > 0) return 'already_added';
    await manager.query(
      `INSERT INTO source_content_chunks (id, content, meta, "sourceId")
       SELECT id, content, meta, $4
       FROM unnest($1::varchar[], $2::text[], $3::jsonb[]) AS chunk(id, content, meta)`,
      [
        chunks.map(({ id }) => id),
        chunks.map(({ content }) => content),
        chunks.map(({ meta }) => JSON.stringify(meta)),
        sourceId,
      ],
    );
    return 'added';
  }
}
