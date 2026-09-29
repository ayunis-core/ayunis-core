import { ApiKey } from 'src/iam/api-keys/domain/api-key.entity';
import { ApiKeyRecord } from 'src/iam/api-keys/infrastructure/repositories/local/schema/api-key.record';

export class ApiKeyMapper {
  static toDomain(record: ApiKeyRecord): ApiKey {
    return new ApiKey({
      id: record.id,
      name: record.name,
      description: record.description,
      prefix: record.prefix,
      hash: record.hash,
      expiresAt: record.expiresAt,
      revokedAt: record.revokedAt,
      orgId: record.orgId,
      createdByUserId: record.createdByUserId,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }

  static toRecord(domain: ApiKey): ApiKeyRecord {
    const record = new ApiKeyRecord();
    record.id = domain.id;
    record.name = domain.name;
    record.description = domain.description;
    record.prefix = domain.prefix;
    record.hash = domain.hash;
    record.expiresAt = domain.expiresAt;
    record.revokedAt = domain.revokedAt;
    record.orgId = domain.orgId;
    record.createdByUserId = domain.createdByUserId;
    record.createdAt = domain.createdAt;
    record.updatedAt = domain.updatedAt;
    return record;
  }
}
