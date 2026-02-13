import { Injectable, Logger } from '@nestjs/common';
import { ThreadsRepository } from '../../ports/threads.repository';
import { AddMcpIntegrationToThreadCommand } from './add-mcp-integration-to-thread.command';
import { ContextService } from 'src/common/context/services/context.service';
import { ThreadNotFoundError } from '../../threads.errors';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';

@Injectable()
export class AddMcpIntegrationToThreadUseCase {
  private readonly logger = new Logger(AddMcpIntegrationToThreadUseCase.name);

  constructor(
    private readonly threadsRepository: ThreadsRepository,
    private readonly contextService: ContextService,
  ) {}

  async execute(command: AddMcpIntegrationToThreadCommand): Promise<void> {
    this.logger.log('execute', {
      threadId: command.threadId,
      mcpIntegrationId: command.mcpIntegrationId,
    });

    const userId = this.contextService.get('userId');
    if (!userId) {
      throw new UnauthorizedAccessError();
    }

    const thread = await this.threadsRepository.findOne(
      command.threadId,
      userId,
    );

    if (!thread) {
      throw new ThreadNotFoundError(command.threadId, userId);
    }

    const alreadyAssigned = thread.mcpIntegrationIds.includes(
      command.mcpIntegrationId,
    );

    if (alreadyAssigned) {
      return;
    }

    const updatedIds = [...thread.mcpIntegrationIds, command.mcpIntegrationId];

    await this.threadsRepository.updateMcpIntegrations({
      threadId: command.threadId,
      userId,
      mcpIntegrationIds: updatedIds,
    });
  }
}
