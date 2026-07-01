import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { UUID } from 'crypto';

import { AcademyCompletionRepository } from '../../../application/ports/academy-completion.repository';
import { AcademyCompletion } from '../../../domain/academy-completion.entity';
import { AcademyCompletionRecord } from './schema/academy-completion.record';
import { AcademyMapper } from './mappers/academy.mapper';

@Injectable()
export class LocalAcademyCompletionRepository implements AcademyCompletionRepository {
  private readonly logger = new Logger(LocalAcademyCompletionRepository.name);

  constructor(
    @InjectRepository(AcademyCompletionRecord)
    private readonly repository: Repository<AcademyCompletionRecord>,
    private readonly mapper: AcademyMapper,
  ) {}

  async findByUser(userId: UUID): Promise<AcademyCompletion | null> {
    this.logger.log('findByUser', { userId });
    const record = await this.repository.findOne({ where: { userId } });
    if (!record) return null;
    return this.mapper.completionToDomain(record);
  }

  async upsert(completion: AcademyCompletion): Promise<AcademyCompletion> {
    this.logger.log('upsert', { userId: completion.userId });
    const record = this.mapper.completionToRecord(completion);
    const saved = await this.repository.save(record);
    return this.mapper.completionToDomain(saved);
  }
}
