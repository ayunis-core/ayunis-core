import { Injectable, Logger } from '@nestjs/common';
import { MarketplaceClient } from '../../ports/marketplace-client.port';
import { GetMarketplaceAgentQuery } from './get-marketplace-agent.query';
import { AgentResponseDto } from 'src/common/clients/marketplace/generated/ayunisMarketplaceAPI.schemas';
import { ApplicationError } from 'src/common/errors/base.error';
import {
  MarketplaceAgentNotFoundError,
  MarketplaceUnavailableError,
} from '../../marketplace.errors';

@Injectable()
export class GetMarketplaceAgentUseCase {
  private readonly logger = new Logger(GetMarketplaceAgentUseCase.name);

  constructor(private readonly marketplaceClient: MarketplaceClient) {}

  async execute(query: GetMarketplaceAgentQuery): Promise<AgentResponseDto> {
    this.logger.log('execute', { identifier: query.identifier });

    try {
      const agent = await this.marketplaceClient.getAgentByIdentifier(
        query.identifier,
      );

      if (!agent) {
        throw new MarketplaceAgentNotFoundError(query.identifier);
      }

      return agent;
    } catch (error) {
      if (error instanceof ApplicationError) {
        throw error;
      }
      this.logger.error('Failed to fetch marketplace agent', {
        identifier: query.identifier,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw new MarketplaceUnavailableError();
    }
  }
}
