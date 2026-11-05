import { Injectable } from '@nestjs/common';
import { MemoryEntry } from 'src/domain/memory/domain/memory-entry.entity';
import { MemoryEntryRecord } from 'src/domain/memory/infrastructure/persistence/local/schema/memory-entry.record';

@Injectable()
export class MemoryEntryMapper {
  toDomain(record: MemoryEntryRecord): MemoryEntry {
    return new MemoryEntry({
      id: record.id,
      userId: record.userId,
      key: record.key,
      content: record.content,
      description: record.description,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }

  toRecord(domain: MemoryEntry): MemoryEntryRecord {
    const record = new MemoryEntryRecord();
    record.id = domain.id;
    record.userId = domain.userId;
    record.key = domain.key;
    record.content = domain.content;
    record.description = domain.description;
    record.createdAt = domain.createdAt;
    record.updatedAt = domain.updatedAt;
    return record;
  }
}
