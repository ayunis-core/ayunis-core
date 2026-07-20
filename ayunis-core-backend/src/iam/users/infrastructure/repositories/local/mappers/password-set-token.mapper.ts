import { PasswordSetToken } from 'src/iam/users/domain/password-set-token.entity';
import type { PasswordSetTokenPurpose } from 'src/iam/users/domain/value-objects/password-set-token-purpose.enum';
import { PasswordSetTokenRecord } from '../schema/password-set-token.record';

export class PasswordSetTokenMapper {
  static toDomain(record: PasswordSetTokenRecord): PasswordSetToken {
    return new PasswordSetToken({
      id: record.id,
      userId: record.userId,
      tokenHash: record.tokenHash,
      purpose: record.purpose as PasswordSetTokenPurpose,
      expiresAt: record.expiresAt,
      usedAt: record.usedAt,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }

  static toRecord(domain: PasswordSetToken): PasswordSetTokenRecord {
    const record = new PasswordSetTokenRecord();
    record.id = domain.id;
    record.userId = domain.userId;
    record.tokenHash = domain.tokenHash;
    record.purpose = domain.purpose;
    record.expiresAt = domain.expiresAt;
    record.usedAt = domain.usedAt;
    record.createdAt = domain.createdAt;
    record.updatedAt = domain.updatedAt;
    return record;
  }
}
