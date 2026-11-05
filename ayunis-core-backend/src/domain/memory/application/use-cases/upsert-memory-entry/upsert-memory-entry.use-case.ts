import type { UUID } from 'crypto';
import { Injectable, Logger } from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { ContextService } from 'src/common/context/services/context.service';
import { getRequiredUserContext } from 'src/common/context/required-context';
import { MemoryRepository } from 'src/domain/memory/application/ports/memory.repository';
import {
  InvalidMemoryKeyError,
  MemoryContentTooLongError,
  MemoryDescriptionTooLongError,
  MemoryEntryLimitReachedError,
  UnexpectedMemoryError,
} from 'src/domain/memory/application/memory.errors';
import { MemoryEntry } from 'src/domain/memory/domain/memory-entry.entity';
import {
  MEMORY_CONTENT_MAX_LENGTH,
  MEMORY_DESCRIPTION_MAX_LENGTH,
  MEMORY_MAX_ENTRIES_PER_USER,
  isValidMemoryKey,
} from 'src/domain/memory/domain/memory.constants';
import { UpsertMemoryEntryCommand } from './upsert-memory-entry.command';

@Injectable()
export class UpsertMemoryEntryUseCase {
  private readonly logger = new Logger(UpsertMemoryEntryUseCase.name);

  constructor(
    private readonly memoryRepository: MemoryRepository,
    private readonly contextService: ContextService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedMemoryError)
  @Transactional()
  async execute(command: UpsertMemoryEntryCommand): Promise<MemoryEntry> {
    const { userId } = getRequiredUserContext(this.contextService);
    const content = command.content.trim();
    this.logger.log(
      { userId, key: command.key, contentLength: content.length },
      'execute',
    );

    const description = normalizeDescription(command.description);
    this.assertWritable(command.key, content, description);
    const existing = await this.assertCapacity(userId, command.key);

    return this.memoryRepository.upsert(
      new MemoryEntry({
        userId,
        key: command.key,
        content,
        description:
          description === undefined
            ? (existing?.description ?? null)
            : description,
      }),
    );
  }

  private assertWritable(
    key: string,
    content: string,
    description: string | null | undefined,
  ): void {
    if (!isValidMemoryKey(key)) {
      throw new InvalidMemoryKeyError(key);
    }
    if (content.length > MEMORY_CONTENT_MAX_LENGTH) {
      throw new MemoryContentTooLongError(key, content.length);
    }
    if (description && description.length > MEMORY_DESCRIPTION_MAX_LENGTH) {
      throw new MemoryDescriptionTooLongError(key, description.length);
    }
  }

  private async assertCapacity(
    userId: UUID,
    key: string,
  ): Promise<MemoryEntry | null> {
    const [existing, count] = await Promise.all([
      this.memoryRepository.findByUserIdAndKey(userId, key),
      this.memoryRepository.countByUserId(userId),
    ]);

    if (!existing && count >= MEMORY_MAX_ENTRIES_PER_USER) {
      throw new MemoryEntryLimitReachedError();
    }

    return existing;
  }
}

/** `undefined` means "keep what is stored"; blank text clears the description. */
function normalizeDescription(
  description: string | null | undefined,
): string | null | undefined {
  if (description === undefined) {
    return undefined;
  }
  const trimmed = description?.trim() ?? '';
  return trimmed.length === 0 ? null : trimmed;
}
