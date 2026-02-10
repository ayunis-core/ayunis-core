import { Module } from '@nestjs/common';
import { MarketplaceClient } from './application/ports/marketplace-client.port';
import { MarketplaceHttpClient } from './infrastructure/http/marketplace-http-client';
import { GetMarketplaceAgentUseCase } from './application/use-cases/get-marketplace-agent/get-marketplace-agent.use-case';
import { MarketplaceController } from './presenters/http/marketplace.controller';

@Module({
  providers: [
    {
      provide: MarketplaceClient,
      useClass: MarketplaceHttpClient,
    },
    GetMarketplaceAgentUseCase,
  ],
  controllers: [MarketplaceController],
  exports: [MarketplaceClient, GetMarketplaceAgentUseCase],
})
export class MarketplaceModule {}
