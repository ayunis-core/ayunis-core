import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { UUID } from 'crypto';
import { UserTotpsRepository } from '../../../application/ports/user-totps.repository';
import { UserTotp } from '../../../domain/user-totp.entity';
import { UserTotpRecord } from './schema/user-totp.record';
import { UserTotpMapper } from './mappers/user-totp.mapper';

@Injectable()
export class LocalUserTotpsRepository extends UserTotpsRepository {
  private readonly logger = new Logger(LocalUserTotpsRepository.name);

  constructor(
    @InjectRepository(UserTotpRecord)
    private readonly repository: Repository<UserTotpRecord>,
  ) {
    super();
  }

  async findByUserId(userId: UUID): Promise<UserTotp | null> {
    const record = await this.repository.findOne({ where: { userId } });
    return record ? UserTotpMapper.toDomain(record) : null;
  }

  async upsert(totp: UserTotp): Promise<UserTotp> {
    const saved = await this.repository.save(UserTotpMapper.toRecord(totp));
    return UserTotpMapper.toDomain(saved);
  }

  async deleteByUserId(userId: UUID): Promise<void> {
    await this.repository.delete({ userId });
  }

  async registerFailedAttempt(
    userId: UUID,
    lockThreshold: number,
    lockedUntil: Date,
  ): Promise<number> {
    // Single statement so concurrent failures cannot slip past the lock.
    const threshold = Math.floor(lockThreshold);
    const result = await this.repository
      .createQueryBuilder()
      .update(UserTotpRecord)
      .set({
        failedAttempts: () => '"failedAttempts" + 1',
        lockedUntil: () =>
          `CASE WHEN "failedAttempts" + 1 >= ${threshold} ` +
          `THEN :lockedUntil::timestamptz ELSE "lockedUntil" END`,
      })
      .setParameters({ lockedUntil: lockedUntil.toISOString() })
      .where('"userId" = :userId', { userId })
      .returning('"failedAttempts"')
      .execute();

    const rows = result.raw as { failedAttempts: number }[];
    if (rows.length === 0) {
      this.logger.warn('registerFailedAttempt: no TOTP row', { userId });
      return 0;
    }
    return Number(rows[0].failedAttempts);
  }

  async markVerified(userId: UUID, counter: number): Promise<boolean> {
    const result = await this.repository
      .createQueryBuilder()
      .update(UserTotpRecord)
      .set({
        lastUsedCounter: counter,
        failedAttempts: 0,
        lockedUntil: null,
      })
      .where('"userId" = :userId', { userId })
      .andWhere(
        '("lastUsedCounter" IS NULL OR "lastUsedCounter" < :counter)',
        { counter },
      )
      .execute();

    return result.affected === 1;
  }

  async resetFailures(userId: UUID): Promise<void> {
    await this.repository.update({ userId }, {
      failedAttempts: 0,
      lockedUntil: null,
    });
  }
}
