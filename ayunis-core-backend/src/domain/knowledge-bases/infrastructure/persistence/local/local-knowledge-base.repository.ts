import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { UUID } from 'crypto';
import { KnowledgeBaseRepository } from '../../../application/ports/knowledge-base.repository';
import { KnowledgeBase } from '../../../domain/knowledge-base.entity';
import { KnowledgeBaseRecord } from './schema/knowledge-base.record';
import { KnowledgeBaseMapper } from './mappers/knowledge-base.mapper';
import { SourceRecord } from '../../../../sources/infrastructure/persistence/local/schema/source.record';
import type { Source } from '../../../../sources/domain/source.entity';
import { SourceMapper } from '../../../../sources/infrastructure/persistence/local/mappers/source.mapper';

@Injectable()
export class LocalKnowledgeBaseRepository extends KnowledgeBaseRepository {
  private readonly logger = new Logger(LocalKnowledgeBaseRepository.name);

  constructor(
    @InjectRepository(KnowledgeBaseRecord)
    private readonly repository: Repository<KnowledgeBaseRecord>,
    @InjectRepository(SourceRecord)
    private readonly sourceRepository: Repository<SourceRecord>,
    private readonly mapper: KnowledgeBaseMapper,
    private readonly sourceMapper: SourceMapper,
  ) {
    super();
  }

  async findById(id: UUID): Promise<KnowledgeBase | null> {
    this.logger.debug(`findById: ${id}`);
    const record = await this.repository.findOne({ where: { id } });
    if (!record) {
      return null;
    }
    return this.mapper.toDomain(record);
  }

  async findByIds(ids: UUID[]): Promise<KnowledgeBase[]> {
    this.logger.debug(`findByIds: ${ids.length} ids`);
    if (ids.length === 0) {
      return [];
    }
    const records = await this.repository.find({
      where: ids.map((id) => ({ id })),
    });
    return records.map((record) => this.mapper.toDomain(record));
  }

  async findAllByUserId(userId: UUID): Promise<KnowledgeBase[]> {
    this.logger.debug(`findAllByUserId: ${userId}`);
    const records = await this.repository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
    return records.map((record) => this.mapper.toDomain(record));
  }

  async save(knowledgeBase: KnowledgeBase): Promise<KnowledgeBase> {
    this.logger.debug(`save: ${knowledgeBase.id}`);
    const record = this.mapper.toRecord(knowledgeBase);
    const saved = await this.repository.save(record);
    return this.mapper.toDomain(saved);
  }

  async delete(knowledgeBase: KnowledgeBase): Promise<void> {
    this.logger.debug(`delete: ${knowledgeBase.id}`);
    const record = this.mapper.toRecord(knowledgeBase);
    await this.repository.remove(record);
  }

  async assignSourceToKnowledgeBase(
    sourceId: UUID,
    knowledgeBaseId: UUID,
  ): Promise<void> {
    this.logger.debug(
      `assignSourceToKnowledgeBase: ${sourceId} → ${knowledgeBaseId}`,
    );
    await this.sourceRepository.update(sourceId, { knowledgeBaseId });
  }

  async findSourcesByKnowledgeBaseId(knowledgeBaseId: UUID): Promise<Source[]> {
    this.logger.debug(`findSourcesByKnowledgeBaseId: ${knowledgeBaseId}`);
    const records = await this.sourceRepository.find({
      where: { knowledgeBaseId },
      order: { createdAt: 'DESC' },
    });
    return records.map((record) => this.sourceMapper.toDomain(record));
  }

  async findSourceByIdAndKnowledgeBaseId(
    sourceId: UUID,
    knowledgeBaseId: UUID,
  ): Promise<Source | null> {
    this.logger.debug(
      `findSourceByIdAndKnowledgeBaseId: ${sourceId} in ${knowledgeBaseId}`,
    );
    const record = await this.sourceRepository.findOne({
      where: { id: sourceId, knowledgeBaseId },
    });
    if (!record) {
      return null;
    }
    return this.sourceMapper.toDomain(record);
  }
}
