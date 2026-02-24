import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { UUID } from 'crypto';
import { KnowledgeBaseRepository } from '../../../application/ports/knowledge-base.repository';
import { KnowledgeBase } from '../../../domain/knowledge-base.entity';
import { KnowledgeBaseRecord } from './schema/knowledge-base.record';
import { KnowledgeBaseMapper } from './mappers/knowledge-base.mapper';

@Injectable()
export class LocalKnowledgeBaseRepository extends KnowledgeBaseRepository {
  private readonly logger = new Logger(LocalKnowledgeBaseRepository.name);

  constructor(
    @InjectRepository(KnowledgeBaseRecord)
    private readonly repository: Repository<KnowledgeBaseRecord>,
    private readonly mapper: KnowledgeBaseMapper,
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
}
