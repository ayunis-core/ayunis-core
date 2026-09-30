import { Injectable, Logger } from '@nestjs/common';
import type { IntegrationListResponseDto } from 'src/common/clients/marketplace/generated/ayunisMarketplaceAPI.schemas';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { UnexpectedMarketplaceError } from 'src/domain/marketplace/application/marketplace.errors';
import { MarketplaceClient } from 'src/domain/marketplace/application/ports/marketplace-client.port';

@Injectable()
export class ListMarketplaceIntegrationsUseCase {
  private readonly logger = new Logger(ListMarketplaceIntegrationsUseCase.name);

  constructor(private readonly marketplaceClient: MarketplaceClient) {}

  @HandleUnexpectedErrors(UnexpectedMarketplaceError)
  async execute(): Promise<IntegrationListResponseDto[]> {
    this.logger.log('execute');
    const integrations = await this.marketplaceClient.listIntegrations();
    return [...integrations].sort(
      (a, b) =>
        Number(b.featured) - Number(a.featured) ||
        a.name.localeCompare(b.name, 'de'),
    );
  }
}
