import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { ThreadsRepository } from '../../ports/threads.repository';
import { RemoveMcpIntegrationFromThreadCommand } from './remove-mcp-integration-from-thread.command';
import { ContextService } from 'src/common/context/services/context.service';
import { ThreadNotFoundError } from '../../threads.errors';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';

@Injectable()
export class RemoveMcpIntegrationFromThreadUseCase {
  constructor(
    @InjectPinoLogger(RemoveMcpIntegrationFromThreadUseCase.name)
    private readonly logger: PinoLogger,
    private readonly threadsRepository: ThreadsRepository,
    private readonly contextService: ContextService,
  ) {}

  async execute(command: RemoveMcpIntegrationFromThreadCommand): Promise<void> {
    this.logger.info(
      {
        threadId: command.threadId,
        mcpIntegrationId: command.mcpIntegrationId,
      },
      'execute',
    );

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

    const isAssigned = thread.mcpIntegrationIds.includes(
      command.mcpIntegrationId,
    );

    if (!isAssigned) {
      return;
    }

    const updatedIds = thread.mcpIntegrationIds.filter(
      (id) => id !== command.mcpIntegrationId,
    );

    await this.threadsRepository.updateMcpIntegrations({
      threadId: command.threadId,
      userId,
      mcpIntegrationIds: updatedIds,
    });
  }
}
