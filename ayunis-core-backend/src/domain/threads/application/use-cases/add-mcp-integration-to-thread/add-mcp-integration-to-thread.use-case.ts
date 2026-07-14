import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { ThreadsRepository } from '../../ports/threads.repository';
import { AddMcpIntegrationToThreadCommand } from './add-mcp-integration-to-thread.command';
import { ContextService } from 'src/common/context/services/context.service';
import {
  ThreadNotFoundError,
  UnexpectedThreadError,
} from '../../threads.errors';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { GetMcpIntegrationsByIdsUseCase } from 'src/domain/mcp/application/use-cases/get-mcp-integrations-by-ids/get-mcp-integrations-by-ids.use-case';
import { GetMcpIntegrationsByIdsQuery } from 'src/domain/mcp/application/use-cases/get-mcp-integrations-by-ids/get-mcp-integrations-by-ids.query';
import { McpIntegrationNotFoundError } from 'src/domain/mcp/application/mcp.errors';

@Injectable()
export class AddMcpIntegrationToThreadUseCase {
  private readonly logger = new Logger(AddMcpIntegrationToThreadUseCase.name);

  constructor(
    private readonly threadsRepository: ThreadsRepository,
    private readonly contextService: ContextService,
    private readonly getMcpIntegrationsByIdsUseCase: GetMcpIntegrationsByIdsUseCase,
  ) {}

  @HandleUnexpectedErrors(UnexpectedThreadError)
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

    const integrations = await this.getMcpIntegrationsByIdsUseCase.execute(
      new GetMcpIntegrationsByIdsQuery([command.mcpIntegrationId]),
    );

    if (integrations.length === 0) {
      throw new McpIntegrationNotFoundError(command.mcpIntegrationId);
    }

    const updatedIds = [...thread.mcpIntegrationIds, command.mcpIntegrationId];

    await this.threadsRepository.updateMcpIntegrations({
      threadId: command.threadId,
      userId,
      mcpIntegrationIds: updatedIds,
    });
  }
}
