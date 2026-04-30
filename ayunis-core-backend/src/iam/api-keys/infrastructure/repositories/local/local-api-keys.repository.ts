import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { UUID } from 'crypto';
import { ApiKeysRepository } from '../../../application/ports/api-keys.repository';
import { ApiKey } from '../../../domain/api-key.entity';
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
    this.logger.log('findById', { id });

    const record = await this.apiKeyRepository.findOne({ where: { id } });
    if (!record) {
      return null;
    }
    return ApiKeyMapper.toDomain(record);
  }

  async findByPrefix(prefix: string): Promise<ApiKey | null> {
    this.logger.log('findByPrefix');

    const record = await this.apiKeyRepository.findOne({ where: { prefix } });
    if (!record) {
      return null;
    }
    return ApiKeyMapper.toDomain(record);
  }

  async findByOrgId(orgId: UUID): Promise<ApiKey[]> {
    this.logger.log('findByOrgId', { orgId });

    const records = await this.apiKeyRepository.find({
      where: { orgId, revokedAt: IsNull() },
      order: { createdAt: 'DESC' },
    });
    return records.map((record) => ApiKeyMapper.toDomain(record));
  }

  async create(apiKey: ApiKey): Promise<ApiKey> {
    this.logger.log('create', { id: apiKey.id, orgId: apiKey.orgId });

    const record = ApiKeyMapper.toRecord(apiKey);
    const saved = await this.apiKeyRepository.save(record);
    return ApiKeyMapper.toDomain(saved);
  }

  async revoke(id: UUID): Promise<void> {
    this.logger.log('revoke', { id });

    await this.apiKeyRepository.update(id, { revokedAt: new Date() });
  }
}
