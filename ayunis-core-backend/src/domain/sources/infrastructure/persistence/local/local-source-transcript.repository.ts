import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { TransactionHost } from '@nestjs-cls/transactional';
import type { TransactionalAdapterTypeOrm } from '@nestjs-cls/transactional-adapter-typeorm';
import { randomUUID, type UUID } from 'crypto';
import { Repository, type EntityManager } from 'typeorm';
import { SourceTranscriptRepository } from 'src/domain/sources/application/ports/source-transcript.repository';
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
}
