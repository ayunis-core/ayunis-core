import { Injectable, Logger } from '@nestjs/common';
import { MarketplaceClient } from '../../application/ports/marketplace-client.port';
import { getAyunisMarketplaceAPI } from 'src/common/clients/marketplace/generated/ayunisMarketplaceAPI';
import { SkillResponseDto } from 'src/common/clients/marketplace/generated/ayunisMarketplaceAPI.schemas';
import { MarketplaceHttpError } from 'src/common/clients/marketplace/client';

@Injectable()
export class MarketplaceHttpClient extends MarketplaceClient {
  private readonly logger = new Logger(MarketplaceHttpClient.name);
  private readonly api = getAyunisMarketplaceAPI();

  async getSkillByIdentifier(
    identifier: string,
  ): Promise<SkillResponseDto | null> {
    try {
      return await this.api.publicSkillsControllerGetByIdentifier(identifier);
    } catch (error) {
      if (error instanceof MarketplaceHttpError && error.status === 404) {
        this.logger.debug('Marketplace skill not found', { identifier });
        return null;
      }
      this.logger.warn('Failed to fetch marketplace skill', {
        identifier,
        error: error instanceof Error ? error.message : 'Unknown error',
        status:
          error instanceof MarketplaceHttpError ? error.status : undefined,
      });
      throw error;
    }
  }
}
