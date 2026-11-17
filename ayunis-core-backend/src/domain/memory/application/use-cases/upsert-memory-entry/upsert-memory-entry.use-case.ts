import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { ContextService } from 'src/common/context/services/context.service';
import { getRequiredUserContext } from 'src/common/context/required-context';
import { MemoryRepository } from 'src/domain/memory/application/ports/memory.repository';
import {
  InvalidMemoryKeyError,
  MemoryContentEmptyError,
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
  async execute(command: UpsertMemoryEntryCommand): Promise<MemoryEntry> {
    const { userId } = getRequiredUserContext(this.contextService);
    const content = command.content.trim();
    this.logger.log(
      { userId, key: command.key, contentLength: content.length },
      'execute',
    );

    const description = normalizeDescription(command.description);
    this.assertWritable(command.key, content, description);

    const saved = await this.memoryRepository.upsertWithinLimit(
      new MemoryEntry({
        userId,
        key: command.key,
        content,
        description: description ?? null,
      }),
      {
        limit: MEMORY_MAX_ENTRIES_PER_USER,
        keepDescription: description === undefined,
      },
    );
    if (!saved) {
      throw new MemoryEntryLimitReachedError();
    }
    return saved;
  }

  private assertWritable(
    key: string,
    content: string,
    description: string | null | undefined,
  ): void {
    if (!isValidMemoryKey(key)) {
      throw new InvalidMemoryKeyError(key);
    }
    // An entry without content would read as missing; removing is a delete.
    if (content.length === 0) {
      throw new MemoryContentEmptyError(key);
    }
    if (content.length > MEMORY_CONTENT_MAX_LENGTH) {
      throw new MemoryContentTooLongError(key, content.length);
    }
    if (description && description.length > MEMORY_DESCRIPTION_MAX_LENGTH) {
      throw new MemoryDescriptionTooLongError(key, description.length);
    }
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
