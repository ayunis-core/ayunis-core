import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { AgentRepository } from '../../ports/agent.repository';
import { InstallAgentFromMarketplaceCommand } from './install-agent-from-marketplace.command';
import { Agent } from '../../../domain/agent.entity';
import { GetMarketplaceAgentUseCase } from 'src/domain/marketplace/application/use-cases/get-marketplace-agent/get-marketplace-agent.use-case';
import { GetMarketplaceAgentQuery } from 'src/domain/marketplace/application/use-cases/get-marketplace-agent/get-marketplace-agent.query';
import { ModelResolverService } from '../../services/model-resolver.service';
import { ContextService } from 'src/common/context/services/context.service';
import { ApplicationError } from 'src/common/errors/base.error';
import { MarketplaceInstallFailedError } from '../../agents.errors';

@Injectable()
export class InstallAgentFromMarketplaceUseCase {
  private readonly logger = new Logger(InstallAgentFromMarketplaceUseCase.name);

  constructor(
    private readonly agentRepository: AgentRepository,
    private readonly getMarketplaceAgentUseCase: GetMarketplaceAgentUseCase,
    private readonly modelResolverService: ModelResolverService,
    private readonly contextService: ContextService,
  ) {}

  async execute(command: InstallAgentFromMarketplaceCommand): Promise<Agent> {
    this.logger.log('execute', { identifier: command.identifier });

    const userId = this.contextService.get('userId');
    const orgId = this.contextService.get('orgId');
    if (!userId || !orgId) {
      throw new UnauthorizedException('User not authenticated');
    }

    try {
      // 1. Fetch agent details from marketplace
      const marketplaceAgent = await this.getMarketplaceAgentUseCase.execute(
        new GetMarketplaceAgentQuery(command.identifier),
      );

      // 2. Resolve a model for the agent
      const model = await this.modelResolverService.resolve(
        orgId,
        userId,
        marketplaceAgent.recommendedModelName,
        marketplaceAgent.recommendedModelProvider,
      );

      // 3. Create the agent
      const agent = new Agent({
        name: marketplaceAgent.name,
        instructions: marketplaceAgent.instructions,
        model,
        toolAssignments: [],
        sourceAssignments: [],
        mcpIntegrationIds: [],
        marketplaceIdentifier: marketplaceAgent.identifier,
        userId,
      });

      return await this.agentRepository.create(agent);
    } catch (error) {
      if (error instanceof ApplicationError) {
        throw error;
      }
      this.logger.error('Failed to install marketplace agent', {
        identifier: command.identifier,
        userId,
        orgId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw new MarketplaceInstallFailedError(command.identifier);
    }
  }
}
