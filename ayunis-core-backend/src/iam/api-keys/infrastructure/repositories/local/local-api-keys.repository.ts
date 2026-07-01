import { Injectable, Logger } from '@nestjs/common';
import { LessThan, Repository } from 'typeorm';
import { UUID } from 'crypto';
import { ApiKeysRepository } from '../../../application/ports/api-keys.repository';
import { ApiKey } from '../../../domain/api-key.entity';
import { ApiKeyRecord } from './schema/api-key.record';
import { ApiKeyMapper } from './mappers/api-key.mapper';

@Injectable()
export class LocalApiKeysRepository extends ApiKeysRepository {
  private readonly logger = new Logger(LocalApiKeysRepository.name);

  constructor(private readonly apiKeyRepository: Repository<ApiKeyRecord>) {
    super();
  }

  async findById(id: UUID): Promise<ApiKey | null> {
    this.logger.log('findById', { id });

    const record = await this.apiKeyRepository.findOne({ where: { id } });
    if (!record) {
      return null;
    }
    return ApiKeyMapper.toDomain(record);
  }

  async findByOrgId(orgId: UUID): Promise<ApiKey[]> {
    this.logger.log('findByOrgId', { orgId });

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
    this.logger.log('create', { id: apiKey.id, orgId: apiKey.orgId });

    const record = ApiKeyMapper.toRecord(apiKey);
    const saved = await this.apiKeyRepository.save(record);
    return ApiKeyMapper.toDomain(saved);
  }

  // Conditional UPDATE so concurrent revokes preserve the original revoked_at
  // timestamp — a second call with revoked_at already set is a no-op.
  async revoke(id: UUID): Promise<void> {
    this.logger.log('revoke', { id });

    await this.apiKeyRepository
      .createQueryBuilder()
      .update(ApiKeyRecord)
      .set({ revokedAt: () => 'NOW()' })
      .where('id = :id AND revoked_at IS NULL', { id })
      .execute();
  }

  // A NULL expires_at never satisfies `expires_at < cutoff`, so keys without an
  // expiry (and revoked-but-not-expired keys) are left untouched by design.
  async countExpiredBefore(cutoff: Date): Promise<number> {
    this.logger.log('countExpiredBefore', { cutoff });

    return this.apiKeyRepository.count({
      where: { expiresAt: LessThan(cutoff) },
    });
  }

  async deleteExpiredBefore(cutoff: Date): Promise<number> {
    this.logger.log('deleteExpiredBefore', { cutoff });

    const result = await this.apiKeyRepository.delete({
      expiresAt: LessThan(cutoff),
    });

    const deletedCount = result.affected ?? 0;
    this.logger.debug('Expired API keys purged', {
      cutoff,
      count: deletedCount,
    });
    return deletedCount;
  }
}
