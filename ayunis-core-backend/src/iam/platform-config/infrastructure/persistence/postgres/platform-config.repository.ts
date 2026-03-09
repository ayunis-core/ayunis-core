import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PlatformConfigRepositoryPort } from '../../../application/ports/platform-config.repository';
import type { PlatformConfigKey } from '../../../domain/platform-config-keys.enum';
import { PlatformConfig } from '../../../domain/platform-config.entity';
import { PlatformConfigRecord } from './schema/platform-config.record';

@Injectable()
export class PlatformConfigRepository extends PlatformConfigRepositoryPort {
  constructor(
    @InjectRepository(PlatformConfigRecord)
    private readonly repository: Repository<PlatformConfigRecord>,
  ) {
    super();
  }

  async get(key: PlatformConfigKey): Promise<PlatformConfig | null> {
    const record = await this.repository.findOne({ where: { key } });

    if (!record) {
      return null;
    }

    return new PlatformConfig({ key: record.key, value: record.value });
  }

  async set(key: PlatformConfigKey, value: string): Promise<void> {
    await this.repository.upsert({ key, value }, ['key']);
  }
}
