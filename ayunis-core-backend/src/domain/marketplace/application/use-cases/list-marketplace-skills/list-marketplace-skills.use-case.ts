import { Injectable, Logger } from '@nestjs/common';
import type { SkillListResponseDto } from 'src/common/clients/marketplace/generated/ayunisMarketplaceAPI.schemas';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { UnexpectedMarketplaceError } from 'src/domain/marketplace/application/marketplace.errors';
import { MarketplaceClient } from 'src/domain/marketplace/application/ports/marketplace-client.port';

@Injectable()
export class ListMarketplaceSkillsUseCase {
  private readonly logger = new Logger(ListMarketplaceSkillsUseCase.name);

  constructor(private readonly marketplaceClient: MarketplaceClient) {}

  @HandleUnexpectedErrors(UnexpectedMarketplaceError)
  async execute(): Promise<SkillListResponseDto[]> {
    this.logger.log('execute');
    const skills = await this.marketplaceClient.listSkills();
    return [...skills].sort(
      (a, b) =>
        Number(b.featured) - Number(a.featured) ||
        a.name.localeCompare(b.name, 'de'),
    );
  }
}
