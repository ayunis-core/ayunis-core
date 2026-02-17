import { Injectable, Logger } from '@nestjs/common';
import { MarketplaceClient } from '../../ports/marketplace-client.port';
import { GetMarketplaceSkillQuery } from './get-marketplace-skill.query';
import { SkillResponseDto } from 'src/common/clients/marketplace/generated/ayunisMarketplaceAPI.schemas';
import { ApplicationError } from 'src/common/errors/base.error';
import {
  MarketplaceSkillNotFoundError,
  MarketplaceUnavailableError,
} from '../../marketplace.errors';

@Injectable()
export class GetMarketplaceSkillUseCase {
  private readonly logger = new Logger(GetMarketplaceSkillUseCase.name);

  constructor(private readonly marketplaceClient: MarketplaceClient) {}

  async execute(query: GetMarketplaceSkillQuery): Promise<SkillResponseDto> {
    this.logger.log('execute', { identifier: query.identifier });

    try {
      const skill = await this.marketplaceClient.getSkillByIdentifier(
        query.identifier,
      );

      if (!skill) {
        throw new MarketplaceSkillNotFoundError(query.identifier);
      }

      return skill;
    } catch (error) {
      if (error instanceof ApplicationError) {
        throw error;
      }
      this.logger.error('Failed to fetch marketplace skill', {
        identifier: query.identifier,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw new MarketplaceUnavailableError();
    }
  }
}
