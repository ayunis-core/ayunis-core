import { Injectable, Logger } from '@nestjs/common';
import type { RoutineListItemResponseDto } from 'src/common/clients/marketplace/generated/ayunisMarketplaceAPI.schemas';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { UnexpectedMarketplaceError } from 'src/domain/marketplace/application/marketplace.errors';
import { MarketplaceClient } from 'src/domain/marketplace/application/ports/marketplace-client.port';

@Injectable()
export class ListMarketplaceRoutinesUseCase {
  private readonly logger = new Logger(ListMarketplaceRoutinesUseCase.name);

  constructor(private readonly marketplaceClient: MarketplaceClient) {}

  @HandleUnexpectedErrors(UnexpectedMarketplaceError)
  async execute(): Promise<RoutineListItemResponseDto[]> {
    this.logger.log('execute');
    const routines = await this.marketplaceClient.listRoutines();
    return [...routines].sort(
      (a, b) =>
        Number(b.featured) - Number(a.featured) ||
        a.name.localeCompare(b.name, 'de'),
    );
  }
}
