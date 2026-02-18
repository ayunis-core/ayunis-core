import { Module } from '@nestjs/common';
import { MarketplaceClient } from './application/ports/marketplace-client.port';
import { MarketplaceHttpClient } from './infrastructure/http/marketplace-http-client';
import { GetMarketplaceSkillUseCase } from './application/use-cases/get-marketplace-skill/get-marketplace-skill.use-case';
import { GetMarketplaceIntegrationUseCase } from './application/use-cases/get-marketplace-integration/get-marketplace-integration.use-case';
import { MarketplaceController } from './presenters/http/marketplace.controller';

@Module({
  providers: [
    {
      provide: MarketplaceClient,
      useClass: MarketplaceHttpClient,
    },
    GetMarketplaceSkillUseCase,
    GetMarketplaceIntegrationUseCase,
  ],
  controllers: [MarketplaceController],
  exports: [
    MarketplaceClient,
    GetMarketplaceSkillUseCase,
    GetMarketplaceIntegrationUseCase,
  ],
})
export class MarketplaceModule {}
