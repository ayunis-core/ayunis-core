import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UUID } from 'crypto';
import {
  ApiKeysRepository,
  type ApiKeyMetadataChanges,
} from 'src/iam/api-keys/application/ports/api-keys.repository';
import { ApiKey } from 'src/iam/api-keys/domain/api-key.entity';
import { ApiKeyRecord } from 'src/iam/api-keys/infrastructure/repositories/local/schema/api-key.record';
import { ApiKeyMapper } from 'src/iam/api-keys/infrastructure/repositories/local/mappers/api-key.mapper';

@Injectable()
export class LocalApiKeysRepository extends ApiKeysRepository {
  private readonly logger = new Logger(LocalApiKeysRepository.name);

  constructor(
    @InjectRepository(ApiKeyRecord)
    private readonly apiKeyRepository: Repository<ApiKeyRecord>,
  ) {
    super();
  }

  async findById(id: UUID): Promise<ApiKey | null> {
    this.logger.log({ id }, 'findById');

    const record = await this.apiKeyRepository.findOne({ where: { id } });
    if (!record) {
      return null;
    }
    return ApiKeyMapper.toDomain(record);
  }

  async findByOrgId(orgId: UUID): Promise<ApiKey[]> {
    this.logger.log({ orgId }, 'findByOrgId');

    const records = await this.apiKeyRepository.find({
      where: { orgId },
      order: { createdAt: 'DESC' },
    });
    return records.map((record) => ApiKeyMapper.toDomain(record));
  }

  async findByPrefix(prefix: string): Promise<ApiKey | null> {
    this.logger.log('findByPrefix');

    const record = await this.apiKeyRepository.findOne({ where: { prefix } });
    if (!record) {
      return null;
    }
    return ApiKeyMapper.toDomain(record);
  }

  async create(apiKey: ApiKey): Promise<ApiKey> {
    this.logger.log({ id: apiKey.id, orgId: apiKey.orgId }, 'create');

    const record = ApiKeyMapper.toRecord(apiKey);
    const saved = await this.apiKeyRepository.save(record);
    return ApiKeyMapper.toDomain(saved);
  }

  // Conditional UPDATE so concurrent revokes preserve the original revoked_at
  // timestamp — a second call with revoked_at already set is a no-op.
  async revoke(id: UUID): Promise<void> {
    this.logger.log({ id }, 'revoke');

    await this.apiKeyRepository
      .createQueryBuilder()
      .update(ApiKeyRecord)
      .set({ revokedAt: () => 'NOW()' })
      .where('id = :id AND revoked_at IS NULL', { id })
      .execute();
  }

  // The active check lives in the UPDATE itself so a concurrent revoke or an
  // expiry between read and write cannot be overwritten with new metadata.
  // clock_timestamp() instead of NOW(): NOW() is fixed at transaction start
  // and would miss an expiry that passes while the UPDATE waits for a lock.
  async updateMetadataIfActive(
    id: UUID,
    orgId: UUID,
    changes: ApiKeyMetadataChanges,
  ): Promise<boolean> {
    this.logger.log({ id, orgId }, 'updateMetadataIfActive');

    const result = await this.apiKeyRepository
      .createQueryBuilder()
      .update(ApiKeyRecord)
      .set(changes)
      .where('id = :id', { id })
      .andWhere('org_id = :orgId', { orgId })
      .andWhere('revoked_at IS NULL')
      .andWhere('(expires_at IS NULL OR expires_at > clock_timestamp())')
      .execute();
    return (result.affected ?? 0) > 0;
  }
}
