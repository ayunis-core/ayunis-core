import { Injectable, Logger } from '@nestjs/common';
import type { RoutineListItemResponseDto } from 'src/common/clients/marketplace/generated/ayunisMarketplaceAPI.schemas';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { UnexpectedMarketplaceError } from 'src/domain/marketplace/application/marketplace.errors';
import { selectMarketplaceSuggestions } from 'src/domain/marketplace/application/models/marketplace-suggestions';
import { MarketplaceClient } from 'src/domain/marketplace/application/ports/marketplace-client.port';

@Injectable()
export class ListSuggestedMarketplaceRoutinesUseCase {
  private readonly logger = new Logger(
    ListSuggestedMarketplaceRoutinesUseCase.name,
  );

  constructor(private readonly marketplaceClient: MarketplaceClient) {}

  @HandleUnexpectedErrors(UnexpectedMarketplaceError)
  async execute(): Promise<RoutineListItemResponseDto[]> {
    this.logger.log('execute');
    return selectMarketplaceSuggestions(
      await this.marketplaceClient.listRoutines(),
    );
  }
}
