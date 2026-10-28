import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThanOrEqual, MoreThan, type Repository } from 'typeorm';
import {
  SsoBrokerSessionsRepository,
  type SsoBrokerSession,
} from 'src/iam/sso/application/ports/sso-broker-sessions.repository';
import { SsoBrokerSessionRecord } from 'src/iam/sso/infrastructure/persistence/postgres/schema/sso-broker-session.record';

@Injectable()
export class PostgresSsoBrokerSessionsRepository extends SsoBrokerSessionsRepository {
  constructor(
    @InjectRepository(SsoBrokerSessionRecord)
    private readonly repository: Repository<SsoBrokerSessionRecord>,
  ) {
    super();
  }

  async upsert(session: SsoBrokerSession): Promise<void> {
    await this.repository.upsert(session, {
      conflictPaths: ['zitadelSessionId'],
    });
  }

  async findActiveByZitadelSessionId(
    zitadelSessionId: string,
    now: Date,
  ): Promise<SsoBrokerSession | null> {
    const record = await this.repository.findOne({
      where: { zitadelSessionId, expiresAt: MoreThan(now) },
    });
    if (!record) return null;
    return {
      userId: record.userId,
      zitadelSessionId: record.zitadelSessionId,
      encryptedIdToken: record.encryptedIdToken,
      expiresAt: record.expiresAt,
    };
  }

  async deleteExpired(now: Date): Promise<number> {
    const result = await this.repository.delete({
      expiresAt: LessThanOrEqual(now),
    });
    return result.affected ?? 0;
  }
}
