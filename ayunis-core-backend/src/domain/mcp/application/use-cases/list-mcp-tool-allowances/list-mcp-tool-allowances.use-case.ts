import { Injectable, Logger } from '@nestjs/common';
import type { UUID } from 'crypto';
import { ContextService } from 'src/common/context/services/context.service';
import { getRequiredUserContext } from 'src/common/context/required-context';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { UnexpectedMcpError } from 'src/domain/mcp/application/mcp.errors';
import { McpIntegrationsRepositoryPort } from 'src/domain/mcp/application/ports/mcp-integrations.repository.port';
import { McpToolAllowanceRepositoryPort } from 'src/domain/mcp/application/ports/mcp-tool-allowance.repository.port';
import { MarketplaceMcpIntegration } from 'src/domain/mcp/domain/integrations/marketplace-mcp-integration.entity';
import type { McpIntegration } from 'src/domain/mcp/domain/mcp-integration.entity';
import type { McpToolAllowance } from 'src/domain/mcp/domain/mcp-tool-allowance.entity';

export interface McpToolAllowanceListItem {
  allowance: McpToolAllowance;
  integrationName: string;
  integrationLogoUrl: string | null;
}

@Injectable()
export class ListMcpToolAllowancesUseCase {
  private readonly logger = new Logger(ListMcpToolAllowancesUseCase.name);

  constructor(
    private readonly allowanceRepository: McpToolAllowanceRepositoryPort,
    private readonly integrationRepository: McpIntegrationsRepositoryPort,
    private readonly contextService: ContextService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedMcpError)
  async execute(): Promise<McpToolAllowanceListItem[]> {
    this.logger.log('listMcpToolAllowances');

    const { userId, orgId } = getRequiredUserContext(this.contextService);
    const allowances = await this.allowanceRepository.findByUser(userId);
    if (allowances.length === 0) {
      return [];
    }

    const integrations = await this.integrationRepository.findByIds([
      ...new Set(allowances.map((allowance) => allowance.integrationId)),
    ]);
    const integrationsById = new Map<UUID, McpIntegration>(
      integrations
        .filter((integration) => integration.orgId === orgId)
        .map((integration) => [integration.id, integration]),
    );

    return allowances.flatMap((allowance) => {
      const integration = integrationsById.get(allowance.integrationId);
      if (!integration) return [];
      return [
        {
          allowance,
          integrationName: integration.name,
          integrationLogoUrl:
            integration instanceof MarketplaceMcpIntegration
              ? integration.logoUrl
              : null,
        },
      ];
    });
  }
}
