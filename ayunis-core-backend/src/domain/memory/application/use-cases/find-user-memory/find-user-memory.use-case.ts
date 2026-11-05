import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { ContextService } from 'src/common/context/services/context.service';
import { getRequiredUserContext } from 'src/common/context/required-context';
import { MemoryRepository } from 'src/domain/memory/application/ports/memory.repository';
import { UnexpectedMemoryError } from 'src/domain/memory/application/memory.errors';
import type { MemoryEntry } from 'src/domain/memory/domain/memory-entry.entity';

@Injectable()
export class FindUserMemoryUseCase {
  private readonly logger = new Logger(FindUserMemoryUseCase.name);

  constructor(
    private readonly memoryRepository: MemoryRepository,
    private readonly contextService: ContextService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedMemoryError)
  async execute(): Promise<MemoryEntry[]> {
    const { userId } = getRequiredUserContext(this.contextService);
    this.logger.log({ userId }, 'execute');

    return this.memoryRepository.findAllByUserId(userId);
  }
}
