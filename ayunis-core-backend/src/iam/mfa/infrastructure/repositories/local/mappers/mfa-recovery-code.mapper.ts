import { MfaRecoveryCode } from 'src/iam/mfa/domain/mfa-recovery-code.entity';
import { MfaRecoveryCodeRecord } from '../schema/mfa-recovery-code.record';

export class MfaRecoveryCodeMapper {
  static toDomain(record: MfaRecoveryCodeRecord): MfaRecoveryCode {
    return new MfaRecoveryCode({
      id: record.id,
      userId: record.userId,
      codeHash: record.codeHash,
      usedAt: record.usedAt,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }

  static toRecord(domain: MfaRecoveryCode): MfaRecoveryCodeRecord {
    const record = new MfaRecoveryCodeRecord();
    record.id = domain.id;
    record.userId = domain.userId;
    record.codeHash = domain.codeHash;
    record.usedAt = domain.usedAt;
    record.createdAt = domain.createdAt;
    record.updatedAt = domain.updatedAt;
    return record;
  }
}
