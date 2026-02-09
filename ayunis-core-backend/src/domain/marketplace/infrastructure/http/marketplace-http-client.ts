import { Injectable, Logger } from '@nestjs/common';
import { MarketplaceClient } from '../../application/ports/marketplace-client.port';
import { getAyunisMarketplaceAPI } from 'src/common/clients/marketplace/generated/ayunisMarketplaceAPI';
import {
  AgentResponseDto,
  AgentListResponseDto,
} from 'src/common/clients/marketplace/generated/ayunisMarketplaceAPI.schemas';

@Injectable()
export class MarketplaceHttpClient extends MarketplaceClient {
  private readonly logger = new Logger(MarketplaceHttpClient.name);
  private readonly api = getAyunisMarketplaceAPI();

  async getAgentByIdentifier(
    identifier: string,
  ): Promise<AgentResponseDto | null> {
    try {
      return await this.api.publicAgentsControllerGetByIdentifier(identifier);
    } catch (error) {
      this.logger.warn('Failed to fetch marketplace agent', {
        identifier,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return null;
    }
  }

  async getPreInstalledAgents(): Promise<AgentListResponseDto[]> {
    try {
      return await this.api.publicAgentsControllerListPreInstalled();
    } catch (error) {
      this.logger.warn(
        'Failed to fetch pre-installed agents from marketplace',
        {
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      );
      return [];
    }
  }
}
