import { Module } from '@nestjs/common';
import { MarketplaceClient } from './application/ports/marketplace-client.port';
import { MarketplaceHttpClient } from './infrastructure/http/marketplace-http-client';
import { GetMarketplaceSkillUseCase } from './application/use-cases/get-marketplace-skill/get-marketplace-skill.use-case';
import { GetMarketplaceIntegrationUseCase } from './application/use-cases/get-marketplace-integration/get-marketplace-integration.use-case';
import { ListMarketplaceCatalogueUseCase } from './application/use-cases/list-marketplace-catalogue/list-marketplace-catalogue.use-case';
import { MarketplaceController } from './presenters/http/marketplace.controller';

@Module({
  providers: [
    {
      provide: MarketplaceClient,
      useClass: MarketplaceHttpClient,
    },
    GetMarketplaceSkillUseCase,
    GetMarketplaceIntegrationUseCase,
    ListMarketplaceCatalogueUseCase,
  ],
  controllers: [MarketplaceController],
  exports: [
    MarketplaceClient,
    GetMarketplaceSkillUseCase,
    GetMarketplaceIntegrationUseCase,
    ListMarketplaceCatalogueUseCase,
  ],
})
export class MarketplaceModule {}
