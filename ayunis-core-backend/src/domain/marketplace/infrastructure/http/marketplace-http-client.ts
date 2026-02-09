import { Injectable, Logger } from '@nestjs/common';
import { MarketplaceClient } from '../../application/ports/marketplace-client.port';
import { getAyunisMarketplaceAPI } from 'src/common/clients/marketplace/generated/ayunisMarketplaceAPI';
import {
  AgentResponseDto,
  AgentListResponseDto,
} from 'src/common/clients/marketplace/generated/ayunisMarketplaceAPI.schemas';
import { MarketplaceHttpError } from 'src/common/clients/marketplace/client';

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
      // Only return null for 404 (not found) - rethrow other errors
      // so use cases can distinguish "not found" from "service unavailable"
      if (error instanceof MarketplaceHttpError && error.status === 404) {
        this.logger.debug('Marketplace agent not found', { identifier });
        return null;
      }
      this.logger.warn('Failed to fetch marketplace agent', {
        identifier,
        error: error instanceof Error ? error.message : 'Unknown error',
        status:
          error instanceof MarketplaceHttpError ? error.status : undefined,
      });
      throw error;
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
          status:
            error instanceof MarketplaceHttpError ? error.status : undefined,
        },
      );
      // Rethrow the error so use cases can detect marketplace unavailability
      throw error;
    }
  }
}
