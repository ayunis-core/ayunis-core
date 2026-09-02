import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
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
export class LocalAcademyCompletionRepository extends AcademyCompletionRepository {
  constructor(
    @InjectPinoLogger(LocalAcademyCompletionRepository.name)
    private readonly logger: PinoLogger,
    @InjectRepository(AcademyCompletionRecord)
    private readonly repository: Repository<AcademyCompletionRecord>,
    private readonly mapper: AcademyMapper,
  ) {
    super();
  }

  async findByUser(userId: UUID): Promise<AcademyCompletion | null> {
    this.logger.debug({ userId }, 'findByUser');
    const record = await this.repository.findOne({ where: { userId } });
    if (!record) return null;
    return this.mapper.completionToDomain(record);
  }

  async findByUsers(userIds: UUID[]): Promise<AcademyCompletion[]> {
    this.logger.debug({ userCount: userIds.length }, 'findByUsers');
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
    this.logger.info({ userId: completion.userId }, 'upsert');
    const record = this.mapper.completionToRecord(completion);
    const result = await this.repository
      .createQueryBuilder()
      .insert()
      .into(AcademyCompletionRecord)
      .values(record)
      .orUpdate(['completedAt'], ['userId'])
      .returning('*')
      .execute();
    const rows: unknown = result.raw;
    if (!Array.isArray(rows) || rows.length === 0) {
      throw new Error('Completion upsert returned no row');
    }
    const saved = this.repository.create(
      rows[0] as Partial<AcademyCompletionRecord>,
    );
    return this.mapper.completionToDomain(saved);
  }
}
