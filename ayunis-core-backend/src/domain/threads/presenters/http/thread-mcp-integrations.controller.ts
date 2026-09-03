import {
  Controller,
  Post,
  Delete,
  Param,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { UUID } from 'crypto';
import { ApiOperation, ApiResponse, ApiParam, ApiTags } from '@nestjs/swagger';

import { AddMcpIntegrationToThreadUseCase } from 'src/domain/threads/application/use-cases/add-mcp-integration-to-thread/add-mcp-integration-to-thread.use-case';
import { AddMcpIntegrationToThreadCommand } from 'src/domain/threads/application/use-cases/add-mcp-integration-to-thread/add-mcp-integration-to-thread.command';
import { RemoveMcpIntegrationFromThreadUseCase } from 'src/domain/threads/application/use-cases/remove-mcp-integration-from-thread/remove-mcp-integration-from-thread.use-case';
import { RemoveMcpIntegrationFromThreadCommand } from 'src/domain/threads/application/use-cases/remove-mcp-integration-from-thread/remove-mcp-integration-from-thread.command';
import { RequireAcademyCertificate } from 'src/iam/academy-access/application/decorators/academy-certificate.decorator';

@ApiTags('threads')
@RequireAcademyCertificate()
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
    this.logger.log({ threadId, mcpIntegrationId }, 'addMcpIntegration');
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
    this.logger.log({ threadId, mcpIntegrationId }, 'removeMcpIntegration');
    await this.removeMcpIntegrationFromThreadUseCase.execute(
      new RemoveMcpIntegrationFromThreadCommand(threadId, mcpIntegrationId),
    );
  }
}
