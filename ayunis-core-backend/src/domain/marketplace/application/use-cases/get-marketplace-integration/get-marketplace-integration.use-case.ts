import { Injectable, Logger } from '@nestjs/common';
import { MarketplaceClient } from '../../ports/marketplace-client.port';
import { GetMarketplaceIntegrationQuery } from './get-marketplace-integration.query';
import { IntegrationResponseDto } from 'src/common/clients/marketplace/generated/ayunisMarketplaceAPI.schemas';
import { ApplicationError } from 'src/common/errors/base.error';
import {
  MarketplaceIntegrationNotFoundError,
  MarketplaceUnavailableError,
} from '../../marketplace.errors';

@Injectable()
export class GetMarketplaceIntegrationUseCase {
  private readonly logger = new Logger(GetMarketplaceIntegrationUseCase.name);

  constructor(private readonly marketplaceClient: MarketplaceClient) {}

  async execute(
    query: GetMarketplaceIntegrationQuery,
  ): Promise<IntegrationResponseDto> {
    this.logger.log('execute', { identifier: query.identifier });

    try {
      const integration =
        await this.marketplaceClient.getIntegrationByIdentifier(
          query.identifier,
        );

      if (!integration) {
        throw new MarketplaceIntegrationNotFoundError(query.identifier);
      }

      return integration;
    } catch (error) {
      if (error instanceof ApplicationError) {
        throw error;
      }
      this.logger.error('Failed to fetch marketplace integration', {
        identifier: query.identifier,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw new MarketplaceUnavailableError();
    }
  }
}
