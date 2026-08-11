import { Injectable, Logger } from '@nestjs/common';
import type { UUID } from 'crypto';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { ContextService } from 'src/common/context/services/context.service';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { ThreadsRepository } from 'src/domain/threads/application/ports/threads.repository';
import { UnexpecteThreadError } from 'src/domain/threads/application/threads.errors';
import { ToggleThreadPinnedCommand } from './toggle-thread-pinned.command';

@Injectable()
export class ToggleThreadPinnedUseCase {
  private readonly logger = new Logger(ToggleThreadPinnedUseCase.name);

  constructor(
    private readonly threadsRepository: ThreadsRepository,
    private readonly contextService: ContextService,
  ) {}

  @HandleUnexpectedErrors(UnexpecteThreadError)
  async execute(command: ToggleThreadPinnedCommand): Promise<boolean> {
    this.logger.log('toggleThreadPinned', { threadId: command.threadId });
    return await this.threadsRepository.togglePinned(
      command.threadId,
      this.resolveUserId(),
    );
  }

  private resolveUserId(): UUID {
    const userId = this.contextService.get('userId');
    if (!userId) {
      throw new UnauthorizedAccessError();
    }
    return userId;
  }
}
