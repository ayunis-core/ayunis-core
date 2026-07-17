import { RefreshToken } from '../../../../domain/refresh-token.entity';
import { RefreshTokenRecord } from '../schema/refresh-token.record';

export class RefreshTokenMapper {
  static toDomain(record: RefreshTokenRecord): RefreshToken {
    return new RefreshToken({
      id: record.id,
      userId: record.userId,
      familyId: record.familyId,
      tokenHash: record.tokenHash,
      expiresAt: record.expiresAt,
      usedAt: record.usedAt,
      revokedAt: record.revokedAt,
      replacedByTokenId: record.replacedByTokenId,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }

  static toRecord(domain: RefreshToken): RefreshTokenRecord {
    const record = new RefreshTokenRecord();
    record.id = domain.id;
    record.userId = domain.userId;
    record.familyId = domain.familyId;
    record.tokenHash = domain.tokenHash;
    record.expiresAt = domain.expiresAt;
    record.usedAt = domain.usedAt;
    record.revokedAt = domain.revokedAt;
    record.replacedByTokenId = domain.replacedByTokenId;
    record.createdAt = domain.createdAt;
    record.updatedAt = domain.updatedAt;
    return record;
  }
}
