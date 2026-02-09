import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { UUID } from 'crypto';
import { AgentRepository } from '../../ports/agent.repository';
import { InstallAgentFromMarketplaceCommand } from './install-agent-from-marketplace.command';
import { Agent } from '../../../domain/agent.entity';
import { GetMarketplaceAgentUseCase } from 'src/domain/marketplace/application/use-cases/get-marketplace-agent/get-marketplace-agent.use-case';
import { GetMarketplaceAgentQuery } from 'src/domain/marketplace/application/use-cases/get-marketplace-agent/get-marketplace-agent.query';
import { PermittedModelsRepository } from 'src/domain/models/application/ports/permitted-models.repository';
import { UserDefaultModelsRepository } from 'src/domain/models/application/ports/user-default-models.repository';
import { PermittedLanguageModel } from 'src/domain/models/domain/permitted-model.entity';
import { ModelProvider } from 'src/domain/models/domain/value-objects/model-provider.enum';
import { ContextService } from 'src/common/context/services/context.service';
import { ApplicationError } from 'src/common/errors/base.error';
import {
  NoPermittedModelError,
  MarketplaceInstallFailedError,
} from '../../agents.errors';

@Injectable()
export class InstallAgentFromMarketplaceUseCase {
  private readonly logger = new Logger(InstallAgentFromMarketplaceUseCase.name);

  constructor(
    private readonly agentRepository: AgentRepository,
    private readonly getMarketplaceAgentUseCase: GetMarketplaceAgentUseCase,
    private readonly permittedModelsRepository: PermittedModelsRepository,
    private readonly userDefaultModelsRepository: UserDefaultModelsRepository,
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
      const model = await this.resolveModel(
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

  private async resolveModel(
    orgId: UUID,
    userId: UUID,
    recommendedModelName: string | null,
    recommendedModelProvider: string | null,
  ): Promise<PermittedLanguageModel> {
    // Try exact match on recommended model name + provider
    if (recommendedModelName && recommendedModelProvider) {
      const providerEnum =
        recommendedModelProvider.toLowerCase() as ModelProvider;
      if (Object.values(ModelProvider).includes(providerEnum)) {
        const exactMatch = await this.permittedModelsRepository.findOneLanguage(
          {
            name: recommendedModelName,
            provider: providerEnum,
          },
        );
        if (exactMatch && exactMatch.orgId === orgId) {
          this.logger.debug('Found exact model match', {
            name: recommendedModelName,
            provider: recommendedModelProvider,
          });
          return exactMatch;
        }
      }
    }

    // Fall back to user's default model
    const userDefault =
      await this.userDefaultModelsRepository.findByUserId(userId);
    if (userDefault) {
      this.logger.debug('Using user default model');
      return userDefault;
    }

    // Fall back to org default model
    const orgDefault =
      await this.permittedModelsRepository.findOrgDefaultLanguage(orgId);
    if (orgDefault) {
      this.logger.debug('Using org default model');
      return orgDefault;
    }

    // Last resort: pick the first permitted language model
    const allModels =
      await this.permittedModelsRepository.findManyLanguage(orgId);
    if (allModels.length > 0) {
      this.logger.debug('Using first available permitted model');
      return allModels[0];
    }

    throw new NoPermittedModelError();
  }
}
