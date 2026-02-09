import { Injectable, Logger } from '@nestjs/common';
import { AgentRepository } from '../../ports/agent.repository';
import { ProvisionPreInstalledAgentsCommand } from './provision-pre-installed-agents.command';
import { Agent } from '../../../domain/agent.entity';
import { GetPreInstalledAgentsUseCase } from 'src/domain/marketplace/application/use-cases/get-pre-installed-agents/get-pre-installed-agents.use-case';
import { GetMarketplaceAgentUseCase } from 'src/domain/marketplace/application/use-cases/get-marketplace-agent/get-marketplace-agent.use-case';
import { GetMarketplaceAgentQuery } from 'src/domain/marketplace/application/use-cases/get-marketplace-agent/get-marketplace-agent.query';
import { PermittedModelsRepository } from 'src/domain/models/application/ports/permitted-models.repository';
import { UserDefaultModelsRepository } from 'src/domain/models/application/ports/user-default-models.repository';
import { PermittedLanguageModel } from 'src/domain/models/domain/permitted-model.entity';
import { ModelProvider } from 'src/domain/models/domain/value-objects/model-provider.enum';
import { UUID } from 'crypto';

@Injectable()
export class ProvisionPreInstalledAgentsUseCase {
  private readonly logger = new Logger(ProvisionPreInstalledAgentsUseCase.name);

  constructor(
    private readonly agentRepository: AgentRepository,
    private readonly getPreInstalledAgentsUseCase: GetPreInstalledAgentsUseCase,
    private readonly getMarketplaceAgentUseCase: GetMarketplaceAgentUseCase,
    private readonly permittedModelsRepository: PermittedModelsRepository,
    private readonly userDefaultModelsRepository: UserDefaultModelsRepository,
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
        defaultModel = await this.resolveDefaultModel(
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
          const model = await this.resolveModelForAgent(
            command.orgId,
            fullAgent.recommendedModelName,
            fullAgent.recommendedModelProvider,
            defaultModel,
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

  private async resolveDefaultModel(
    orgId: UUID,
    userId: UUID,
  ): Promise<PermittedLanguageModel | null> {
    // Try user default
    const userDefault =
      await this.userDefaultModelsRepository.findByUserId(userId);
    if (userDefault) return userDefault;

    // Try org default
    const orgDefault =
      await this.permittedModelsRepository.findOrgDefaultLanguage(orgId);
    if (orgDefault) return orgDefault;

    // First available
    const allModels =
      await this.permittedModelsRepository.findManyLanguage(orgId);
    return allModels.length > 0 ? allModels[0] : null;
  }

  private async resolveModelForAgent(
    orgId: UUID,
    recommendedModelName: string | null,
    recommendedModelProvider: string | null,
    fallbackModel: PermittedLanguageModel,
  ): Promise<PermittedLanguageModel> {
    if (recommendedModelName && recommendedModelProvider) {
      try {
        const providerEnum =
          recommendedModelProvider.toLowerCase() as ModelProvider;
        if (Object.values(ModelProvider).includes(providerEnum)) {
          const exactMatch =
            await this.permittedModelsRepository.findOneLanguage({
              name: recommendedModelName,
              provider: providerEnum,
            });
          if (exactMatch && exactMatch.orgId === orgId) {
            return exactMatch;
          }
        }
      } catch (error) {
        this.logger.warn(
          'Failed to resolve recommended model, using fallback',
          {
            recommendedModelName,
            recommendedModelProvider,
            error: error instanceof Error ? error.message : 'Unknown error',
          },
        );
      }
    }
    return fallbackModel;
  }
}
