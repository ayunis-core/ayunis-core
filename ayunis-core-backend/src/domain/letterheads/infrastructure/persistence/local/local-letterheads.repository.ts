import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { UUID } from 'crypto';

import { LetterheadsRepository } from '../../../application/ports/letterheads-repository.port';
import { LetterheadNotFoundError } from '../../../application/letterheads.errors';
import { Letterhead } from '../../../domain/letterhead.entity';
import { LetterheadRecord } from './schema/letterhead.record';
import { LetterheadMapper } from './mappers/letterhead.mapper';

@Injectable()
export class LocalLetterheadsRepository extends LetterheadsRepository {
  private readonly logger = new Logger(LocalLetterheadsRepository.name);

  constructor(
    @InjectRepository(LetterheadRecord)
    private readonly repo: Repository<LetterheadRecord>,
    private readonly mapper: LetterheadMapper,
  ) {
    super();
  }

  async findAllByOrgId(orgId: UUID): Promise<Letterhead[]> {
    const records = await this.repo.find({
      where: { orgId },
      order: { createdAt: 'ASC' },
    });
    return records.map((r) => this.mapper.toDomain(r));
  }

  async findById(orgId: UUID, id: UUID): Promise<Letterhead | null> {
    const record = await this.repo.findOne({ where: { orgId, id } });
    return record ? this.mapper.toDomain(record) : null;
  }

  async save(letterhead: Letterhead): Promise<Letterhead> {
    this.logger.log(`Saving letterhead ${letterhead.id}`);
    const record = this.mapper.toRecord(letterhead);
    const saved = await this.repo.save(record);
    return this.mapper.toDomain(saved);
  }

  async delete(orgId: UUID, id: UUID): Promise<void> {
    const result = await this.repo.delete({ orgId, id });
    if (!result.affected) {
      throw new LetterheadNotFoundError(id);
    }
  }
}
