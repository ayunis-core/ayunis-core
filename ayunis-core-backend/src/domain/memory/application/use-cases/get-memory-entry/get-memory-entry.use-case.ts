import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { ContextService } from 'src/common/context/services/context.service';
import { getRequiredUserContext } from 'src/common/context/required-context';
import { MemoryRepository } from 'src/domain/memory/application/ports/memory.repository';
import { MemoryAvailabilityService } from 'src/domain/memory/application/services/memory-availability.service';
import {
  InvalidMemoryKeyError,
  UnexpectedMemoryError,
} from 'src/domain/memory/application/memory.errors';
import { isValidMemoryKey } from 'src/domain/memory/domain/memory.constants';
import type { MemoryEntry } from 'src/domain/memory/domain/memory-entry.entity';
import { GetMemoryEntryQuery } from './get-memory-entry.query';

@Injectable()
export class GetMemoryEntryUseCase {
  private readonly logger = new Logger(GetMemoryEntryUseCase.name);

  constructor(
    private readonly memoryRepository: MemoryRepository,
    private readonly contextService: ContextService,
    private readonly memoryAvailability: MemoryAvailabilityService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedMemoryError)
  async execute(query: GetMemoryEntryQuery): Promise<MemoryEntry | null> {
    const { userId } = getRequiredUserContext(this.contextService);
    this.logger.log({ userId, key: query.key }, 'execute');

    await this.memoryAvailability.assertEnabled();

    if (!isValidMemoryKey(query.key)) {
      throw new InvalidMemoryKeyError(query.key);
    }

    return this.memoryRepository.findByUserIdAndKey(userId, query.key);
  }
}
