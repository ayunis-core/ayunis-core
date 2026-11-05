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
import { DeleteMemoryEntryCommand } from './delete-memory-entry.command';

@Injectable()
export class DeleteMemoryEntryUseCase {
  private readonly logger = new Logger(DeleteMemoryEntryUseCase.name);

  constructor(
    private readonly memoryRepository: MemoryRepository,
    private readonly contextService: ContextService,
    private readonly memoryAvailability: MemoryAvailabilityService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedMemoryError)
  async execute(command: DeleteMemoryEntryCommand): Promise<void> {
    const { userId } = getRequiredUserContext(this.contextService);
    this.logger.log({ userId, key: command.key }, 'execute');

    await this.memoryAvailability.assertEnabled();

    if (!isValidMemoryKey(command.key)) {
      throw new InvalidMemoryKeyError(command.key);
    }

    await this.memoryRepository.deleteByUserIdAndKey(userId, command.key);
  }
}
