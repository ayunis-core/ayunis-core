import { Injectable, Logger } from '@nestjs/common';
import { Repository } from 'typeorm';
import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterTypeOrm } from '@nestjs-cls/transactional-adapter-typeorm';
import type { UUID } from 'crypto';
import { randomUUID } from 'crypto';
import { AcademyModuleViewTimeRepository } from 'src/domain/academy/application/ports/academy-module-view-time.repository';
import type { AcademyModuleViewTime } from 'src/domain/academy/domain/academy-module-view-time.entity';
import { lockLearner } from './lock-learner';
import { AcademyMapper } from './mappers/academy.mapper';
import { AcademyModuleViewTimeRecord } from './schema/academy-module-view-time.record';

@Injectable()
export class LocalAcademyModuleViewTimeRepository extends AcademyModuleViewTimeRepository {
  private readonly logger = new Logger(
    LocalAcademyModuleViewTimeRepository.name,
  );

  constructor(
    private readonly txHost: TransactionHost<TransactionalAdapterTypeOrm>,
    private readonly mapper: AcademyMapper,
  ) {
    super();
  }

  private get repository(): Repository<AcademyModuleViewTimeRecord> {
    return this.txHost.tx.getRepository(AcademyModuleViewTimeRecord);
  }

  async findAllByUser(userId: UUID): Promise<AcademyModuleViewTime[]> {
    this.logger.log({ userId }, 'findAllByUser');
    const records = await this.repository.find({ where: { userId } });
    return records.map((record) => this.mapper.moduleViewTimeToDomain(record));
  }

  async recordHeartbeat(params: {
    userId: UUID;
    courseModuleId: UUID;
    sessionStart: boolean;
    maxIncrementSeconds: number;
  }): Promise<void> {
    this.logger.log(
      {
        userId: params.userId,
        courseModuleId: params.courseModuleId,
        sessionStart: params.sessionStart,
      },
      'recordHeartbeat',
    );
    await this.txHost.withTransaction(async () => {
      // Two videos beating at once must not both read the same latest stamp.
      await lockLearner(this.txHost.tx, params.userId);
      // One clock per learner: credit the time since the learner's latest
      // heartbeat on any video, so videos open at once split the time.
      // GREATEST(0, …) guards against a stamp a moment ahead of now().
      const table = this.repository.metadata.tablePath;
      await this.repository.query(
        `INSERT INTO ${table} AS t
           ("id", "userId", "courseModuleId", "visibleSeconds", "lastHeartbeatAt")
         VALUES ($1, $2, $3, 0, now())
         ON CONFLICT ("userId", "courseModuleId") DO UPDATE SET
           "visibleSeconds" = t."visibleSeconds" +
             CASE WHEN $4::boolean THEN 0 ELSE LEAST(
               GREATEST(0, EXTRACT(EPOCH FROM (now() - (
                 SELECT max(latest."lastHeartbeatAt")
                 FROM ${table} latest
                 WHERE latest."userId" = $2
               )))),
               $5::double precision
             ) END,
           "lastHeartbeatAt" = now(),
           "updatedAt" = now()`,
        [
          randomUUID(),
          params.userId,
          params.courseModuleId,
          params.sessionStart,
          params.maxIncrementSeconds,
        ],
      );
    });
  }

  async deleteAllByUser(userId: UUID): Promise<void> {
    this.logger.log({ userId }, 'deleteAllByUser');
    await this.repository.delete({ userId });
  }
}
