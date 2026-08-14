import { SsoLoginTransaction } from 'src/iam/sso/domain/sso-login-transaction.entity';
import { SsoLoginTransactionRecord } from 'src/iam/sso/infrastructure/persistence/postgres/schema/sso-login-transaction.record';

export class SsoLoginTransactionMapper {
  static toRecord(transaction: SsoLoginTransaction): SsoLoginTransactionRecord {
    const record = new SsoLoginTransactionRecord();
    Object.assign(record, transaction);
    return record;
  }

  static toDomain(record: SsoLoginTransactionRecord): SsoLoginTransaction {
    return new SsoLoginTransaction({
      id: record.id,
      stateHash: record.stateHash,
      browserBindingHash: record.browserBindingHash,
      postLoginPath: record.postLoginPath,
      encryptedCodeVerifier: record.encryptedCodeVerifier,
      encryptedNonce: record.encryptedNonce,
      orgId: record.orgId,
      zitadelOrgId: record.zitadelOrgId,
      purpose: record.purpose,
      linkUserId: record.linkUserId,
      expiresAt: record.expiresAt,
      consumedAt: record.consumedAt,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }
}
