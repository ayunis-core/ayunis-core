import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { UUID } from 'crypto';
import { AnonymizationWhitelistRepository } from 'src/domain/anonymization-settings/application/ports/anonymization-whitelist.repository';
import { AnonymizationWhitelistEntry } from 'src/domain/anonymization-settings/domain/anonymization-whitelist-entry.entity';
import { AnonymizationWhitelistEntryRecord } from './schema/anonymization-whitelist-entry.record';
import { AnonymizationWhitelistEntryMapper } from './mappers/anonymization-whitelist-entry.mapper';

@Injectable()
export class PostgresAnonymizationWhitelistRepository extends AnonymizationWhitelistRepository {
  private readonly logger = new Logger(
    PostgresAnonymizationWhitelistRepository.name,
  );

  constructor(
    @InjectRepository(AnonymizationWhitelistEntryRecord)
    private readonly repository: Repository<AnonymizationWhitelistEntryRecord>,
  ) {
    super();
  }

  async findByOrgId(orgId: UUID): Promise<AnonymizationWhitelistEntry[]> {
    this.logger.debug('findByOrgId', { orgId });

    const records = await this.repository.find({
      where: { orgId },
      order: { category: 'ASC' },
    });

    return records.map((record) =>
      AnonymizationWhitelistEntryMapper.toDomain(record),
    );
  }

  async replaceForOrg(
    orgId: UUID,
    entries: AnonymizationWhitelistEntry[],
  ): Promise<AnonymizationWhitelistEntry[]> {
    this.logger.debug('replaceForOrg', { orgId, entryCount: entries.length });

    await this.repository.manager.transaction(async (manager) => {
      await manager.delete(AnonymizationWhitelistEntryRecord, { orgId });
      if (entries.length > 0) {
        await manager.save(
          entries.map((entry) =>
            AnonymizationWhitelistEntryMapper.toRecord(entry),
          ),
        );
      }
    });

    return this.findByOrgId(orgId);
  }
}
