import { Injectable, Logger } from '@nestjs/common';
import { ContextService } from 'src/common/context/services/context.service';
import { getRequiredUserContext } from 'src/common/context/required-context';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { UnexpectedMcpError } from 'src/domain/mcp/application/mcp.errors';
import { McpToolAllowanceRepositoryPort } from 'src/domain/mcp/application/ports/mcp-tool-allowance.repository.port';
import { McpToolAllowance } from 'src/domain/mcp/domain/mcp-tool-allowance.entity';
import { FindMcpToolAllowancesQuery } from './find-mcp-tool-allowances.query';

/**
 * Loads the current user's always-allowed tools of the given integrations in
 * one query, for deciding which MCP tool calls need confirmation.
 */
@Injectable()
export class FindMcpToolAllowancesUseCase {
  private readonly logger = new Logger(FindMcpToolAllowancesUseCase.name);

  constructor(
    private readonly allowanceRepository: McpToolAllowanceRepositoryPort,
    private readonly contextService: ContextService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedMcpError)
  async execute(
    query: FindMcpToolAllowancesQuery,
  ): Promise<McpToolAllowance[]> {
    this.logger.log(
      { count: query.integrationIds.length },
      'findMcpToolAllowances',
    );

    const { userId } = getRequiredUserContext(this.contextService);
    return this.allowanceRepository.findByUserAndIntegrationIds(
      userId,
      query.integrationIds,
    );
  }
}
