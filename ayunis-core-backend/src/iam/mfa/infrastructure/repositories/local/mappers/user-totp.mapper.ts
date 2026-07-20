import { UserTotp } from 'src/iam/mfa/domain/user-totp.entity';
import { UserTotpRecord } from '../schema/user-totp.record';

export class UserTotpMapper {
  static toDomain(record: UserTotpRecord): UserTotp {
    return new UserTotp({
      id: record.id,
      userId: record.userId,
      encryptedSecret: record.encryptedSecret,
      confirmedAt: record.confirmedAt,
      failedAttempts: record.failedAttempts,
      lockedUntil: record.lockedUntil,
      lastUsedCounter: record.lastUsedCounter,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }

  static toRecord(domain: UserTotp): UserTotpRecord {
    const record = new UserTotpRecord();
    record.id = domain.id;
    record.userId = domain.userId;
    record.encryptedSecret = domain.encryptedSecret;
    record.confirmedAt = domain.confirmedAt;
    record.failedAttempts = domain.failedAttempts;
    record.lockedUntil = domain.lockedUntil;
    record.lastUsedCounter = domain.lastUsedCounter;
    record.createdAt = domain.createdAt;
    record.updatedAt = domain.updatedAt;
    return record;
  }
}
