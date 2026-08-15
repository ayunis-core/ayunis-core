import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
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
  constructor(
    @InjectPinoLogger(GetMarketplaceIntegrationUseCase.name)
    private readonly logger: PinoLogger,
    private readonly marketplaceClient: MarketplaceClient,
  ) {}

  async execute(
    query: GetMarketplaceIntegrationQuery,
  ): Promise<IntegrationResponseDto> {
    this.logger.info({ identifier: query.identifier }, 'execute');

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
