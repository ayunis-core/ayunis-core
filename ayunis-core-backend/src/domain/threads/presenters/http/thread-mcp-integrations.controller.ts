import {
  Controller,
  Post,
  Delete,
  Param,
  ParseUUIDPipe,
  Logger,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { UUID } from 'crypto';
import { ApiOperation, ApiResponse, ApiParam, ApiTags } from '@nestjs/swagger';

import { AddMcpIntegrationToThreadUseCase } from '../../application/use-cases/add-mcp-integration-to-thread/add-mcp-integration-to-thread.use-case';
import { AddMcpIntegrationToThreadCommand } from '../../application/use-cases/add-mcp-integration-to-thread/add-mcp-integration-to-thread.command';
import { RemoveMcpIntegrationFromThreadUseCase } from '../../application/use-cases/remove-mcp-integration-from-thread/remove-mcp-integration-from-thread.use-case';
import { RemoveMcpIntegrationFromThreadCommand } from '../../application/use-cases/remove-mcp-integration-from-thread/remove-mcp-integration-from-thread.command';

@ApiTags('threads')
@Controller('threads')
export class ThreadMcpIntegrationsController {
  private readonly logger = new Logger(ThreadMcpIntegrationsController.name);

  constructor(
    private readonly addMcpIntegrationToThreadUseCase: AddMcpIntegrationToThreadUseCase,
    private readonly removeMcpIntegrationFromThreadUseCase: RemoveMcpIntegrationFromThreadUseCase,
  ) {}

  @Post(':id/mcp-integrations/:mcpIntegrationId')
  @ApiOperation({ summary: 'Add an MCP integration to a thread' })
  @ApiParam({
    name: 'id',
    description: 'The UUID of the thread',
    type: 'string',
    format: 'uuid',
  })
  @ApiParam({
    name: 'mcpIntegrationId',
    description: 'The UUID of the MCP integration to add',
    type: 'string',
    format: 'uuid',
  })
  @ApiResponse({
    status: 204,
    description:
      'The MCP integration has been successfully added to the thread',
  })
  @ApiResponse({
    status: 404,
    description: 'Thread or MCP integration not found',
  })
  @HttpCode(HttpStatus.NO_CONTENT)
  async addMcpIntegration(
    @Param('id', ParseUUIDPipe) threadId: UUID,
    @Param('mcpIntegrationId', ParseUUIDPipe) mcpIntegrationId: UUID,
  ): Promise<void> {
    this.logger.log('addMcpIntegration', { threadId, mcpIntegrationId });
    await this.addMcpIntegrationToThreadUseCase.execute(
      new AddMcpIntegrationToThreadCommand(threadId, mcpIntegrationId),
    );
  }

  @Delete(':id/mcp-integrations/:mcpIntegrationId')
  @ApiOperation({ summary: 'Remove an MCP integration from a thread' })
  @ApiParam({
    name: 'id',
    description: 'The UUID of the thread',
    type: 'string',
    format: 'uuid',
  })
  @ApiParam({
    name: 'mcpIntegrationId',
    description: 'The UUID of the MCP integration to remove',
    type: 'string',
    format: 'uuid',
  })
  @ApiResponse({
    status: 204,
    description:
      'The MCP integration has been successfully removed from the thread',
  })
  @ApiResponse({ status: 404, description: 'Thread not found' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeMcpIntegration(
    @Param('id', ParseUUIDPipe) threadId: UUID,
    @Param('mcpIntegrationId', ParseUUIDPipe) mcpIntegrationId: UUID,
  ): Promise<void> {
    this.logger.log('removeMcpIntegration', { threadId, mcpIntegrationId });
    await this.removeMcpIntegrationFromThreadUseCase.execute(
      new RemoveMcpIntegrationFromThreadCommand(threadId, mcpIntegrationId),
    );
  }
}
