import { Injectable } from '@nestjs/common';
import type { MemoryEntry } from 'src/domain/memory/domain/memory-entry.entity';
import {
  RESERVED_MEMORY_KEYS,
  isReservedMemoryKey,
} from 'src/domain/memory/domain/memory.constants';
import { MemoryEntryResponseDto } from '../dtos/memory-entry-response.dto';

@Injectable()
export class MemoryEntryDtoMapper {
  /**
   * Reserved keys have no row until the assistant writes one, so they are
   * synthesized with empty content and listed first — the settings page always
   * shows them, in the order the system prompt uses.
   */
  toListDto(entries: MemoryEntry[]): MemoryEntryResponseDto[] {
    const byKey = new Map(entries.map((entry) => [entry.key, entry]));

    const reserved = RESERVED_MEMORY_KEYS.map((key) => {
      const entry = byKey.get(key);
      return entry
        ? this.toDto(entry)
        : { key, content: '', isReserved: true, updatedAt: null };
    });

    const open = entries
      .filter((entry) => !isReservedMemoryKey(entry.key))
      .map((entry) => this.toDto(entry));

    return [...reserved, ...open];
  }

  toDto(entry: MemoryEntry): MemoryEntryResponseDto {
    return {
      key: entry.key,
      content: entry.content,
      isReserved: isReservedMemoryKey(entry.key),
      updatedAt: entry.updatedAt.toISOString(),
    };
  }
}
