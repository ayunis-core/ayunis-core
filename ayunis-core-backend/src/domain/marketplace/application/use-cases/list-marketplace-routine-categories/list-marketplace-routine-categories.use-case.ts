import { Injectable, Logger } from '@nestjs/common';
import type { RoutineCategoryResponseDto } from 'src/common/clients/marketplace/generated/ayunisMarketplaceAPI.schemas';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { UnexpectedMarketplaceError } from 'src/domain/marketplace/application/marketplace.errors';
import { MarketplaceClient } from 'src/domain/marketplace/application/ports/marketplace-client.port';

@Injectable()
export class ListMarketplaceRoutineCategoriesUseCase {
  private readonly logger = new Logger(
    ListMarketplaceRoutineCategoriesUseCase.name,
  );

  constructor(private readonly marketplaceClient: MarketplaceClient) {}

  @HandleUnexpectedErrors(UnexpectedMarketplaceError)
  async execute(): Promise<RoutineCategoryResponseDto[]> {
    this.logger.log('execute');
    return this.marketplaceClient.listRoutineCategories();
  }
}
