import { Injectable, Logger } from '@nestjs/common';
import type { RoutineResponseDto } from 'src/common/clients/marketplace/generated/ayunisMarketplaceAPI.schemas';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import {
  MarketplaceRoutineNotFoundError,
  UnexpectedMarketplaceError,
} from 'src/domain/marketplace/application/marketplace.errors';
import { MarketplaceClient } from 'src/domain/marketplace/application/ports/marketplace-client.port';
import { GetMarketplaceRoutineQuery } from './get-marketplace-routine.query';

@Injectable()
export class GetMarketplaceRoutineUseCase {
  private readonly logger = new Logger(GetMarketplaceRoutineUseCase.name);

  constructor(private readonly marketplaceClient: MarketplaceClient) {}

  @HandleUnexpectedErrors(UnexpectedMarketplaceError)
  async execute(
    query: GetMarketplaceRoutineQuery,
  ): Promise<RoutineResponseDto> {
    this.logger.log({ identifier: query.identifier }, 'execute');
    const routine = await this.marketplaceClient.getRoutineByIdentifier(
      query.identifier,
    );
    if (!routine) {
      throw new MarketplaceRoutineNotFoundError(query.identifier);
    }
    return routine;
  }
}
