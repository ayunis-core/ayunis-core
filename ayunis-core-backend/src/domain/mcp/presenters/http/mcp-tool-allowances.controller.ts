import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  Param,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { UUID } from 'crypto';
import { ListMcpToolAllowancesUseCase } from 'src/domain/mcp/application/use-cases/list-mcp-tool-allowances/list-mcp-tool-allowances.use-case';
import { RemoveMcpToolAllowanceUseCase } from 'src/domain/mcp/application/use-cases/remove-mcp-tool-allowance/remove-mcp-tool-allowance.use-case';
import { RemoveMcpToolAllowanceCommand } from 'src/domain/mcp/application/use-cases/remove-mcp-tool-allowance/remove-mcp-tool-allowance.command';
import { McpToolAllowanceResponseDto } from './dto/mcp-tool-allowance-response.dto';
import { McpToolAllowanceResponseMapper } from './mappers/mcp-tool-allowance-response.mapper';

@ApiTags('mcp-tool-allowances')
@Controller('mcp-tool-allowances')
export class McpToolAllowancesController {
  private readonly logger = new Logger(McpToolAllowancesController.name);

  constructor(
    private readonly listMcpToolAllowancesUseCase: ListMcpToolAllowancesUseCase,
    private readonly removeMcpToolAllowanceUseCase: RemoveMcpToolAllowanceUseCase,
    private readonly responseMapper: McpToolAllowanceResponseMapper,
  ) {}

  @Get()
  @ApiOperation({ summary: "List the current user's always-allowed MCP tools" })
  @ApiResponse({ status: 200, type: [McpToolAllowanceResponseDto] })
  async list(): Promise<McpToolAllowanceResponseDto[]> {
    this.logger.log('list');

    const items = await this.listMcpToolAllowancesUseCase.execute();
    return items.map((item) => this.responseMapper.toDto(item));
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: "Remove one of the current user's always-allowed MCP tools",
  })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 204 })
  @ApiResponse({ status: 404, description: 'Always-allowed tool not found' })
  async remove(@Param('id', ParseUUIDPipe) id: UUID): Promise<void> {
    this.logger.log({ id }, 'remove');

    await this.removeMcpToolAllowanceUseCase.execute(
      new RemoveMcpToolAllowanceCommand(id),
    );
  }
}
