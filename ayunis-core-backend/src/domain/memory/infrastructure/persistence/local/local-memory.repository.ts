import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UUID } from 'crypto';
import { MemoryRepository } from 'src/domain/memory/application/ports/memory.repository';
import { MemoryEntry } from 'src/domain/memory/domain/memory-entry.entity';
import { MemoryEntryRecord } from './schema/memory-entry.record';
import { MemoryEntryMapper } from './mappers/memory-entry.mapper';

@Injectable()
export class LocalMemoryRepository extends MemoryRepository {
  private readonly logger = new Logger(LocalMemoryRepository.name);

  constructor(
    @InjectRepository(MemoryEntryRecord)
    private readonly repository: Repository<MemoryEntryRecord>,
    private readonly mapper: MemoryEntryMapper,
  ) {
    super();
  }

  async findAllByUserId(userId: UUID): Promise<MemoryEntry[]> {
    const records = await this.repository.find({
      where: { userId },
      order: { key: 'ASC' },
    });

    return records.map((record) => this.mapper.toDomain(record));
  }

  async findByUserIdAndKey(
    userId: UUID,
    key: string,
  ): Promise<MemoryEntry | null> {
    const record = await this.repository.findOne({ where: { userId, key } });

    return record ? this.mapper.toDomain(record) : null;
  }

  upsertWithinLimit(
    entry: MemoryEntry,
    options: { limit: number; keepDescription: boolean },
  ): Promise<MemoryEntry | null> {
    this.logger.log({ userId: entry.userId, key: entry.key }, 'upsert');

    return this.repository.manager.transaction(async (manager) => {
      // Held until the transaction ends, so a concurrent write of the same
      // user counts this entry before deciding.
      await manager.query(
        'SELECT pg_advisory_xact_lock(hashtextextended($1, 0))',
        [`memory-limit:${entry.userId}`],
      );
      const repository = manager.getRepository(MemoryEntryRecord);
      const where = { userId: entry.userId, key: entry.key };
      const isNew = !(await repository.exists({ where }));
      if (
        isNew &&
        (await repository.count({ where: { userId: entry.userId } })) >=
          options.limit
      ) {
        return null;
      }
      await repository
        .createQueryBuilder()
        .insert()
        .values(this.mapper.toRecord(entry))
        .orUpdate(
          options.keepDescription
            ? ['content', 'updatedAt']
            : ['content', 'description', 'updatedAt'],
          ['userId', 'key'],
        )
        .execute();
      return this.mapper.toDomain(await repository.findOneByOrFail(where));
    });
  }

  async deleteByUserIdAndKey(userId: UUID, key: string): Promise<void> {
    this.logger.log({ userId, key }, 'deleteByUserIdAndKey');

    await this.repository.delete({ userId, key });
  }

  async deleteAllByUserId(userId: UUID): Promise<void> {
    this.logger.log({ userId }, 'deleteAllByUserId');

    await this.repository.delete({ userId });
  }
}
