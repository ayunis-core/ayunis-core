import { Injectable, Logger } from '@nestjs/common';
import { SharesRepository } from '../../ports/shares-repository.port';
import { ContextService } from 'src/common/context/services/context.service';
import { UUID } from 'crypto';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { ApplicationError } from 'src/common/errors/base.error';

@Injectable()
export class DeleteShareUseCase {
  private logger = new Logger(DeleteShareUseCase.name);
  constructor(
    private readonly repository: SharesRepository,
    private readonly contextService: ContextService,
  ) {}

  async execute(id: UUID): Promise<void> {
    try {
      const userId = this.contextService.get('userId');
      if (!userId) {
        throw new UnauthorizedAccessError();
      }
      await this.repository.delete(id, userId);
    } catch (error) {
      if (error instanceof ApplicationError) throw error;
      this.logger.error(error);
      throw new Error('Unexpected error occurred');
    }
  }
}
