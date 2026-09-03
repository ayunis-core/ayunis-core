import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UUID } from 'crypto';
import { ApiKeysRepository } from 'src/iam/api-keys/application/ports/api-keys.repository';
import { ApiKey } from 'src/iam/api-keys/domain/api-key.entity';
import { ApiKeyRecord } from './schema/api-key.record';
import { ApiKeyMapper } from './mappers/api-key.mapper';

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
}
