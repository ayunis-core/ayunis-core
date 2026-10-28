import { Injectable, Logger } from '@nestjs/common';
import { MarketplaceClient } from 'src/domain/marketplace/application/ports/marketplace-client.port';
import { GetMarketplaceIntegrationQuery } from './get-marketplace-integration.query';
import { IntegrationResponseDto } from 'src/common/clients/marketplace/generated/ayunisMarketplaceAPI.schemas';
import { ApplicationError } from 'src/common/errors/base.error';
import {
  MarketplaceIntegrationNotFoundError,
  MarketplaceUnavailableError,
} from 'src/domain/marketplace/application/marketplace.errors';

@Injectable()
export class GetMarketplaceIntegrationUseCase {
  private readonly logger = new Logger(GetMarketplaceIntegrationUseCase.name);

  constructor(private readonly marketplaceClient: MarketplaceClient) {}

  async execute(
    query: GetMarketplaceIntegrationQuery,
  ): Promise<IntegrationResponseDto> {
    this.logger.log({ identifier: query.identifier }, 'execute');

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
      this.logger.error(
        {
          identifier: query.identifier,
          err: error as Error,
        },
        'Failed to fetch marketplace integration',
      );
      throw new MarketplaceUnavailableError();
    }
  }
}
