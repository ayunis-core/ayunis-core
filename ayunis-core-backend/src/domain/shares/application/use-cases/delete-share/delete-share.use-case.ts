import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { SharesRepository } from '../../ports/shares-repository.port';
import { ContextService } from 'src/common/context/services/context.service';
import { UUID } from 'crypto';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { ApplicationError } from 'src/common/errors/base.error';
import { AgentShare } from 'src/domain/shares/domain/share.entity';
import { ReplaceAgentWithDefaultModelUseCase } from 'src/domain/threads/application/use-cases/replace-agent-with-default-model/replace-agent-with-default-model.use-case';
import { ReplaceAgentWithDefaultModelCommand } from 'src/domain/threads/application/use-cases/replace-agent-with-default-model/replace-agent-with-default-model.command';
import { Transactional } from '@nestjs-cls/transactional';

@Injectable()
export class DeleteShareUseCase {
  private logger = new Logger(DeleteShareUseCase.name);
  constructor(
    private readonly repository: SharesRepository,
    private readonly contextService: ContextService,
    private readonly replaceAgentWithDefaultModel: ReplaceAgentWithDefaultModelUseCase,
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

      // Replace agent in threads BEFORE deletion (while share still exists)
      // Only affect threads NOT owned by the agent owner (current user)
      if (share instanceof AgentShare) {
        await this.replaceAgentWithDefaultModel.execute(
          new ReplaceAgentWithDefaultModelCommand({
            oldAgentId: share.agentId,
            excludeUserId: userId,
          }),
        );
      }

      await this.repository.delete(share);
    } catch (error) {
      if (error instanceof ApplicationError) throw error;
      this.logger.error(error);
      throw new Error('Unexpected error occurred');
    }
  }
}
