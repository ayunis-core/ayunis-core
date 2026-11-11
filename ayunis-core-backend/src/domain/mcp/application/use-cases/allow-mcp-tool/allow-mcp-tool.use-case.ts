import { Injectable, Logger } from '@nestjs/common';
import { ContextService } from 'src/common/context/services/context.service';
import { getRequiredUserContext } from 'src/common/context/required-context';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { UnexpectedMcpError } from 'src/domain/mcp/application/mcp.errors';
import { McpToolAllowanceRepositoryPort } from 'src/domain/mcp/application/ports/mcp-tool-allowance.repository.port';
import { ValidateIntegrationAccessService } from 'src/domain/mcp/application/services/validate-integration-access.service';
import { McpToolAllowance } from 'src/domain/mcp/domain/mcp-tool-allowance.entity';
import { AllowMcpToolCommand } from './allow-mcp-tool.command';

/**
 * Always allows an MCP tool for the current user. Allowing a tool that is
 * already allowed changes nothing.
 */
@Injectable()
export class AllowMcpToolUseCase {
  private readonly logger = new Logger(AllowMcpToolUseCase.name);

  constructor(
    private readonly allowanceRepository: McpToolAllowanceRepositoryPort,
    private readonly validateIntegrationAccess: ValidateIntegrationAccessService,
    private readonly contextService: ContextService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedMcpError)
  async execute(command: AllowMcpToolCommand): Promise<void> {
    this.logger.log(
      { integrationId: command.integrationId, toolName: command.toolName },
      'allowMcpTool',
    );

    const { userId } = getRequiredUserContext(this.contextService);
    await this.validateIntegrationAccess.validate(command.integrationId, {
      requireEnabled: false,
    });

    await this.allowanceRepository.saveIfAbsent(
      new McpToolAllowance({
        userId,
        integrationId: command.integrationId,
        toolName: command.toolName,
      }),
    );
  }
}
