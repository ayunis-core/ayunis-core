import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { SharesRepository } from '../../ports/shares-repository.port';
import { ContextService } from 'src/common/context/services/context.service';
import { UUID } from 'crypto';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { ApplicationError } from 'src/common/errors/base.error';
import { Transactional } from '@nestjs-cls/transactional';

@Injectable()
export class DeleteShareUseCase {
  private logger = new Logger(DeleteShareUseCase.name);
  constructor(
    private readonly repository: SharesRepository,
    private readonly contextService: ContextService,
  ) {}

  @Transactional()
  async execute(id: UUID): Promise<void> {
    try {
      const userId = this.contextService.get('userId');
      if (!userId) {
        throw new UnauthorizedAccessError();
      }

      const share = await this.repository.findById(id);
      if (!share) {
        throw new NotFoundException('Share not found');
      }

      if (share.ownerId !== userId) {
        throw new UnauthorizedAccessError();
      }

      // Note: Threads that used the shared agent will show a
      // "conversation no longer accessible" disclaimer when users
      // try to continue the chat. The history is preserved.

      await this.repository.delete(share);
    } catch (error) {
      if (error instanceof ApplicationError) throw error;
      this.logger.error(error);
      throw new Error('Unexpected error occurred');
    }
  }
}
