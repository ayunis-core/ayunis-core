import { Injectable, Logger } from '@nestjs/common';
import type { SkillCategoryResponseDto } from 'src/common/clients/marketplace/generated/ayunisMarketplaceAPI.schemas';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { UnexpectedMarketplaceError } from 'src/domain/marketplace/application/marketplace.errors';
import { MarketplaceClient } from 'src/domain/marketplace/application/ports/marketplace-client.port';

@Injectable()
export class ListMarketplaceSkillCategoriesUseCase {
  private readonly logger = new Logger(
    ListMarketplaceSkillCategoriesUseCase.name,
  );

  constructor(private readonly marketplaceClient: MarketplaceClient) {}

  @HandleUnexpectedErrors(UnexpectedMarketplaceError)
  async execute(): Promise<SkillCategoryResponseDto[]> {
    this.logger.log('execute');
    return this.marketplaceClient.listCategories();
  }
}
