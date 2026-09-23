import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import type { UUID } from 'crypto';
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

  async createMany(
    words: GlobalAnonymizationWhitelistWord[],
  ): Promise<GlobalAnonymizationWhitelistWord[]> {
    this.logger.debug({ count: words.length }, 'createMany');

    if (words.length === 0) {
      return [];
    }

    // ON CONFLICT DO NOTHING makes the unique (category, wordLowercase) index
    // decide which words are new, so concurrent adds cannot collide and the
    // returned ids are exactly the words that were inserted.
    const result = await this.repository
      .createQueryBuilder()
      .insert()
      .into(GlobalAnonymizationWhitelistWordRecord)
      .values(
        words.map((word) =>
          GlobalAnonymizationWhitelistWordMapper.toRecord(word),
        ),
      )
      .orIgnore()
      .returning(['id'])
      .execute();

    const createdIds = (result.raw as { id: UUID }[]).map((row) => row.id);
    if (createdIds.length === 0) {
      return [];
    }

    // Reload with the user relation so the returned words carry the author's
    // email, same as findAll.
    const records = await this.repository.find({
      where: { id: In(createdIds) },
      relations: { createdByUser: true },
      order: { wordLowercase: 'ASC' },
    });

    return records.map((record) =>
      GlobalAnonymizationWhitelistWordMapper.toDomain(record),
    );
  }

  async delete(id: UUID): Promise<boolean> {
    this.logger.debug({ id }, 'delete');

    const result = await this.repository.delete({ id });
    return (result.affected ?? 0) > 0;
  }
}
