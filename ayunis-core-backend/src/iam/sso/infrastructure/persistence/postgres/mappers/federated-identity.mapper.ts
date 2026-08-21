import { Injectable } from '@nestjs/common';
import { FederatedIdentity } from 'src/iam/sso/domain/federated-identity.entity';
import { FederatedIdentityRecord } from 'src/iam/sso/infrastructure/persistence/postgres/schema/federated-identity.record';

@Injectable()
export class FederatedIdentityMapper {
  toDomain(record: FederatedIdentityRecord): FederatedIdentity {
    return new FederatedIdentity({
      id: record.id,
      issuer: record.issuer,
      subject: record.subject,
      userId: record.userId,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }

  toRecord(identity: FederatedIdentity): FederatedIdentityRecord {
    const record = new FederatedIdentityRecord();
    record.id = identity.id;
    record.issuer = identity.issuer;
    record.subject = identity.subject;
    record.userId = identity.userId;
    record.createdAt = identity.createdAt;
    record.updatedAt = identity.updatedAt;
    return record;
  }
}
