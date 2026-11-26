import { Module } from '@nestjs/common';
import { MarketplaceClient } from './application/ports/marketplace-client.port';
import { MarketplaceHttpClient } from './infrastructure/http/marketplace-http-client';
import { GetMarketplaceSkillUseCase } from './application/use-cases/get-marketplace-skill/get-marketplace-skill.use-case';
import { GetMarketplaceIntegrationUseCase } from './application/use-cases/get-marketplace-integration/get-marketplace-integration.use-case';
import { GetMarketplaceRoutineUseCase } from './application/use-cases/get-marketplace-routine/get-marketplace-routine.use-case';
import { ListMarketplaceSkillsUseCase } from './application/use-cases/list-marketplace-skills/list-marketplace-skills.use-case';
import { ListMarketplaceIntegrationsUseCase } from './application/use-cases/list-marketplace-integrations/list-marketplace-integrations.use-case';
import { ListMarketplaceSkillCategoriesUseCase } from './application/use-cases/list-marketplace-skill-categories/list-marketplace-skill-categories.use-case';
import { ListMarketplaceRoutinesUseCase } from './application/use-cases/list-marketplace-routines/list-marketplace-routines.use-case';
import { ListMarketplaceRoutineCategoriesUseCase } from './application/use-cases/list-marketplace-routine-categories/list-marketplace-routine-categories.use-case';
import { MarketplaceController } from './presenters/http/marketplace.controller';

@Module({
  providers: [
    {
      provide: MarketplaceClient,
      useClass: MarketplaceHttpClient,
    },
    GetMarketplaceSkillUseCase,
    GetMarketplaceIntegrationUseCase,
    GetMarketplaceRoutineUseCase,
    ListMarketplaceSkillsUseCase,
    ListMarketplaceIntegrationsUseCase,
    ListMarketplaceSkillCategoriesUseCase,
    ListMarketplaceRoutinesUseCase,
    ListMarketplaceRoutineCategoriesUseCase,
  ],
  controllers: [MarketplaceController],
  exports: [
    MarketplaceClient,
    GetMarketplaceSkillUseCase,
    GetMarketplaceIntegrationUseCase,
    GetMarketplaceRoutineUseCase,
    ListMarketplaceSkillsUseCase,
    ListMarketplaceIntegrationsUseCase,
    ListMarketplaceSkillCategoriesUseCase,
    ListMarketplaceRoutinesUseCase,
    ListMarketplaceRoutineCategoriesUseCase,
  ],
})
export class MarketplaceModule {}
