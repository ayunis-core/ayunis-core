import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
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
  constructor(
    @InjectPinoLogger(GetMarketplaceSkillUseCase.name)
    private readonly logger: PinoLogger,
    private readonly marketplaceClient: MarketplaceClient,
  ) {}

  async execute(query: GetMarketplaceSkillQuery): Promise<SkillResponseDto> {
    this.logger.info({ identifier: query.identifier }, 'execute');

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
      this.logger.error(
        {
          identifier: query.identifier,
          err: error as Error,
        },
        'Failed to fetch marketplace skill',
      );
      throw new MarketplaceUnavailableError();
    }
  }
}
