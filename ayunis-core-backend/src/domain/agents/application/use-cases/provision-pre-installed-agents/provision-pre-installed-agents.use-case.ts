import { Injectable, Logger } from '@nestjs/common';
import { AgentRepository } from '../../ports/agent.repository';
import { ProvisionPreInstalledAgentsCommand } from './provision-pre-installed-agents.command';
import { Agent } from '../../../domain/agent.entity';
import { GetPreInstalledAgentsUseCase } from 'src/domain/marketplace/application/use-cases/get-pre-installed-agents/get-pre-installed-agents.use-case';
import { GetMarketplaceAgentUseCase } from 'src/domain/marketplace/application/use-cases/get-marketplace-agent/get-marketplace-agent.use-case';
import { GetMarketplaceAgentQuery } from 'src/domain/marketplace/application/use-cases/get-marketplace-agent/get-marketplace-agent.query';
import { ModelResolverService } from '../../services/model-resolver.service';
import { PermittedLanguageModel } from 'src/domain/models/domain/permitted-model.entity';

@Injectable()
export class ProvisionPreInstalledAgentsUseCase {
  private readonly logger = new Logger(ProvisionPreInstalledAgentsUseCase.name);

  constructor(
    private readonly agentRepository: AgentRepository,
    private readonly getPreInstalledAgentsUseCase: GetPreInstalledAgentsUseCase,
    private readonly getMarketplaceAgentUseCase: GetMarketplaceAgentUseCase,
    private readonly modelResolverService: ModelResolverService,
  ) {}

  async execute(command: ProvisionPreInstalledAgentsCommand): Promise<Agent[]> {
    this.logger.log('execute', {
      userId: command.userId,
      orgId: command.orgId,
    });

    const createdAgents: Agent[] = [];

    try {
      // 1. Fetch pre-installed agents list from marketplace
      const preInstalledAgents =
        await this.getPreInstalledAgentsUseCase.execute();

      if (preInstalledAgents.length === 0) {
        this.logger.debug('No pre-installed agents found in marketplace');
        return [];
      }

      this.logger.debug('Found pre-installed agents', {
        count: preInstalledAgents.length,
      });

      // 2. Resolve a default model for the user
      let defaultModel: PermittedLanguageModel | null;
      try {
        defaultModel = await this.modelResolverService.resolveFallbackOrNull(
          command.orgId,
          command.userId,
        );
      } catch (error) {
        this.logger.warn('Failed to resolve default model', {
          userId: command.userId,
          orgId: command.orgId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        return [];
      }

      if (!defaultModel) {
        this.logger.warn(
          'No permitted language model found, skipping pre-installed agents',
        );
        return [];
      }

      // 3. For each pre-installed agent, fetch full details and create
      for (const agentSummary of preInstalledAgents) {
        try {
          const fullAgent = await this.getMarketplaceAgentUseCase.execute(
            new GetMarketplaceAgentQuery(agentSummary.identifier),
          );

          // Try to match recommended model, fall back to default
          const model = await this.modelResolverService.resolve(
            command.orgId,
            command.userId,
            fullAgent.recommendedModelName,
            fullAgent.recommendedModelProvider,
          );

          const agent = new Agent({
            name: fullAgent.name,
            instructions: fullAgent.instructions,
            model,
            toolAssignments: [],
            sourceAssignments: [],
            mcpIntegrationIds: [],
            marketplaceIdentifier: fullAgent.identifier,
            userId: command.userId,
          });

          const created = await this.agentRepository.create(agent);
          createdAgents.push(created);

          this.logger.debug('Pre-installed agent created', {
            identifier: fullAgent.identifier,
            agentId: created.id,
          });
        } catch (error) {
          // Graceful degradation: skip individual agent failures
          this.logger.warn('Failed to provision pre-installed agent', {
            identifier: agentSummary.identifier,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }
    } catch (error) {
      // Graceful degradation: if marketplace is unreachable, don't fail user creation
      this.logger.warn('Failed to provision pre-installed agents', {
        userId: command.userId,
        orgId: command.orgId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }

    this.logger.log('Pre-installed agents provisioned', {
      count: createdAgents.length,
    });

    return createdAgents;
  }
}
