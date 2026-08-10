import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import type { UUID } from 'crypto';

import { AcademyCompletionRepository } from 'src/domain/academy/application/ports/academy-completion.repository';
import { AcademyCompletion } from 'src/domain/academy/domain/academy-completion.entity';
import { AcademyCompletionRecord } from './schema/academy-completion.record';
import { AcademyMapper } from './mappers/academy.mapper';

/**
 * Postgres caps a statement at 65535 bound parameters, so an org-wide id list
 * cannot go into a single `IN`. Chunks run concurrently — the batching is a
 * ceiling, not a reason to serialise the common case.
 */
const MAX_BATCH_SIZE = 500;

@Injectable()
export class LocalAcademyCompletionRepository implements AcademyCompletionRepository {
  private readonly logger = new Logger(LocalAcademyCompletionRepository.name);

  constructor(
    @InjectRepository(AcademyCompletionRecord)
    private readonly repository: Repository<AcademyCompletionRecord>,
    private readonly mapper: AcademyMapper,
  ) {}

  async findByUser(userId: UUID): Promise<AcademyCompletion | null> {
    this.logger.debug('findByUser', { userId });
    const record = await this.repository.findOne({ where: { userId } });
    if (!record) return null;
    return this.mapper.completionToDomain(record);
  }

  async findByUsers(userIds: UUID[]): Promise<AcademyCompletion[]> {
    this.logger.debug('findByUsers', { userCount: userIds.length });
    if (userIds.length === 0) {
      return [];
    }

    const batches: UUID[][] = [];
    for (let i = 0; i < userIds.length; i += MAX_BATCH_SIZE) {
      batches.push(userIds.slice(i, i + MAX_BATCH_SIZE));
    }

    const results = await Promise.all(
      batches.map((batch) =>
        this.repository.find({ where: { userId: In(batch) } }),
      ),
    );

    return results
      .flat()
      .map((record) => this.mapper.completionToDomain(record));
  }

  async upsert(completion: AcademyCompletion): Promise<AcademyCompletion> {
    this.logger.log('upsert', { userId: completion.userId });
    const record = this.mapper.completionToRecord(completion);
    const saved = await this.repository.save(record);
    return this.mapper.completionToDomain(saved);
  }
}
