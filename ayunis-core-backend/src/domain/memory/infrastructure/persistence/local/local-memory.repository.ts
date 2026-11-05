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

  async upsert(entry: MemoryEntry): Promise<MemoryEntry> {
    this.logger.log({ userId: entry.userId, key: entry.key }, 'upsert');

    // Only content, description and updatedAt are overwritten: an existing row
    // keeps its id and createdAt, and a concurrent write cannot lose to a
    // read-then-write.
    await this.repository
      .createQueryBuilder()
      .insert()
      .into(MemoryEntryRecord)
      .values(this.mapper.toRecord(entry))
      .orUpdate(['content', 'description', 'updatedAt'], ['userId', 'key'])
      .execute();

    const saved = await this.repository.findOneOrFail({
      where: { userId: entry.userId, key: entry.key },
    });

    return this.mapper.toDomain(saved);
  }

  async deleteByUserIdAndKey(userId: UUID, key: string): Promise<void> {
    this.logger.log({ userId, key }, 'deleteByUserIdAndKey');

    await this.repository.delete({ userId, key });
  }

  async deleteAllByUserId(userId: UUID): Promise<void> {
    this.logger.log({ userId }, 'deleteAllByUserId');

    await this.repository.delete({ userId });
  }

  async countByUserId(userId: UUID): Promise<number> {
    return this.repository.count({ where: { userId } });
  }
}
