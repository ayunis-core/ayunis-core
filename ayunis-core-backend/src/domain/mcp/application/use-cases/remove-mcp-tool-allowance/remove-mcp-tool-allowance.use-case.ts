import { Injectable, Logger } from '@nestjs/common';
import { ContextService } from 'src/common/context/services/context.service';
import { getRequiredUserContext } from 'src/common/context/required-context';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { UnexpectedMcpError } from 'src/domain/mcp/application/mcp.errors';
import { McpToolAllowanceNotFoundError } from 'src/domain/mcp/application/mcp-tool-allowances.errors';
import { McpToolAllowanceRepositoryPort } from 'src/domain/mcp/application/ports/mcp-tool-allowance.repository.port';
import { RemoveMcpToolAllowanceCommand } from './remove-mcp-tool-allowance.command';

@Injectable()
export class RemoveMcpToolAllowanceUseCase {
  private readonly logger = new Logger(RemoveMcpToolAllowanceUseCase.name);

  constructor(
    private readonly allowanceRepository: McpToolAllowanceRepositoryPort,
    private readonly contextService: ContextService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedMcpError)
  async execute(command: RemoveMcpToolAllowanceCommand): Promise<void> {
    this.logger.log(
      { allowanceId: command.allowanceId },
      'removeMcpToolAllowance',
    );

    const { userId } = getRequiredUserContext(this.contextService);
    const deleted = await this.allowanceRepository.deleteByIdAndUser(
      command.allowanceId,
      userId,
    );
    if (!deleted) {
      throw new McpToolAllowanceNotFoundError(command.allowanceId);
    }
  }
}
