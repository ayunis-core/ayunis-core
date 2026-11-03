import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterTypeOrm } from '@nestjs-cls/transactional-adapter-typeorm';
import type { UUID } from 'crypto';
import { In, LessThan, Repository } from 'typeorm';
import { SourceUploadSessionRepository } from 'src/domain/sources/application/ports/source-upload-session.repository';
import { SourceUploadSession } from 'src/domain/sources/domain/upload/source-upload-session.entity';
import { SourceUploadSessionStatus } from 'src/domain/sources/domain/upload/source-upload-session-status.enum';
import type { UploadedSourceReference } from 'src/domain/sources/domain/upload/uploaded-source-reference';
import { SourceUploadSessionMapper } from './mappers/source-upload-session.mapper';
import { SourceUploadSessionRecord } from './schema/source-upload-session.record';

const ABANDONED_STATUSES = [
  SourceUploadSessionStatus.EXPIRED,
  SourceUploadSessionStatus.ABORTED,
];

@Injectable()
export class LocalSourceUploadSessionRepository extends SourceUploadSessionRepository {
  constructor(
    @InjectRepository(SourceUploadSessionRecord)
    private readonly defaultRepository: Repository<SourceUploadSessionRecord>,
    private readonly mapper: SourceUploadSessionMapper,
    private readonly txHost: TransactionHost<TransactionalAdapterTypeOrm>,
  ) {
    super();
  }

  private get repository(): Repository<SourceUploadSessionRecord> {
    // Scheduled callers can run without an active CLS context.
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    const manager = this.txHost.tx ?? this.defaultRepository.manager;
    return manager.getRepository(SourceUploadSessionRecord);
  }

  async save(session: SourceUploadSession): Promise<SourceUploadSession> {
    const saved = await this.repository.save(this.mapper.toRecord(session));
    return this.mapper.toDomain(saved);
  }

  async findById(id: UUID): Promise<SourceUploadSession | null> {
    const record = await this.repository.findOne({ where: { id } });
    return record ? this.mapper.toDomain(record) : null;
  }

  async transition(
    id: UUID,
    fromStatus: SourceUploadSessionStatus,
    toStatus: SourceUploadSessionStatus,
    updates: Partial<{ sources: UploadedSourceReference[] }> = {},
  ): Promise<boolean> {
    const result = await this.repository.update(
      { id, status: fromStatus },
      { status: toStatus, ...updates },
    );
    return (result.affected ?? 0) > 0;
  }

  async updateSources(
    id: UUID,
    sources: UploadedSourceReference[],
  ): Promise<void> {
    await this.repository.update({ id }, { sources });
  }

  async recordMultipartUploadId(id: UUID, uploadId: string): Promise<void> {
    await this.repository.update(
      { id, status: SourceUploadSessionStatus.PENDING },
      { multipartUploadId: uploadId },
    );
  }

  async findByStorageKey(
    storageKey: string,
  ): Promise<SourceUploadSession | null> {
    const record = await this.repository.findOne({ where: { storageKey } });
    return record ? this.mapper.toDomain(record) : null;
  }

  async findExpiredPending(
    now: Date,
    limit: number,
  ): Promise<SourceUploadSession[]> {
    const records = await this.repository.find({
      where: {
        status: SourceUploadSessionStatus.PENDING,
        expiresAt: LessThan(now),
      },
      order: { expiresAt: 'ASC' },
      take: limit,
    });
    return records.map((record) => this.mapper.toDomain(record));
  }

  async findByStatus(
    status: SourceUploadSessionStatus,
    updatedBefore: Date,
    limit: number,
  ): Promise<SourceUploadSession[]> {
    const records = await this.repository.find({
      where: { status, updatedAt: LessThan(updatedBefore) },
      order: { updatedAt: 'ASC' },
      take: limit,
    });
    return records.map((record) => this.mapper.toDomain(record));
  }

  async deleteCompletedBefore(before: Date): Promise<number> {
    const result = await this.repository.delete({
      status: SourceUploadSessionStatus.COMPLETED,
      updatedAt: LessThan(before),
    });
    return result.affected ?? 0;
  }
  async deleteAbandonedBefore(ids: UUID[], before: Date): Promise<number> {
    if (ids.length === 0) return 0;
    const result = await this.repository.delete({
      id: In(ids),
      status: In(ABANDONED_STATUSES),
      updatedAt: LessThan(before),
    });
    return result.affected ?? 0;
  }
}
