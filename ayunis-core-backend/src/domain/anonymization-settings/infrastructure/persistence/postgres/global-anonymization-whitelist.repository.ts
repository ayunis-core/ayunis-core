import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { UUID } from 'crypto';
import type { PiiCategory } from 'src/common/anonymization/domain/pii-category.enum';
import { GlobalAnonymizationWhitelistRepository } from 'src/domain/anonymization-settings/application/ports/global-anonymization-whitelist.repository';
import { GlobalAnonymizationWhitelistWord } from 'src/domain/anonymization-settings/domain/global-anonymization-whitelist-word.entity';
import { GlobalAnonymizationWhitelistWordRecord } from './schema/global-anonymization-whitelist-word.record';
import { GlobalAnonymizationWhitelistWordMapper } from './mappers/global-anonymization-whitelist-word.mapper';

@Injectable()
export class PostgresGlobalAnonymizationWhitelistRepository extends GlobalAnonymizationWhitelistRepository {
  private readonly logger = new Logger(
    PostgresGlobalAnonymizationWhitelistRepository.name,
  );

  constructor(
    @InjectRepository(GlobalAnonymizationWhitelistWordRecord)
    private readonly repository: Repository<GlobalAnonymizationWhitelistWordRecord>,
  ) {
    super();
  }

  async findAll(): Promise<GlobalAnonymizationWhitelistWord[]> {
    this.logger.debug('findAll');

    const records = await this.repository.find({
      relations: { createdByUser: true },
      order: { category: 'ASC', wordLowercase: 'ASC' },
    });

    return records.map((record) =>
      GlobalAnonymizationWhitelistWordMapper.toDomain(record),
    );
  }

  async findByCategoryAndWord(
    category: PiiCategory,
    word: string,
  ): Promise<GlobalAnonymizationWhitelistWord | null> {
    this.logger.debug('findByCategoryAndWord', { category });

    const record = await this.repository.findOne({
      where: { category, wordLowercase: word.trim().toLowerCase() },
    });

    return record
      ? GlobalAnonymizationWhitelistWordMapper.toDomain(record)
      : null;
  }

  async create(
    word: GlobalAnonymizationWhitelistWord,
  ): Promise<GlobalAnonymizationWhitelistWord> {
    this.logger.debug('create', { category: word.category });

    const record = await this.repository.save(
      GlobalAnonymizationWhitelistWordMapper.toRecord(word),
    );
    // Reload with the user relation so the returned word carries the
    // author's email, same as findAll.
    const reloaded = await this.repository.findOne({
      where: { id: record.id },
      relations: { createdByUser: true },
    });

    return GlobalAnonymizationWhitelistWordMapper.toDomain(reloaded ?? record);
  }

  async delete(id: UUID): Promise<boolean> {
    this.logger.debug('delete', { id });

    const result = await this.repository.delete({ id });
    return (result.affected ?? 0) > 0;
  }
}
