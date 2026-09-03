import { Injectable, Logger } from '@nestjs/common';
import { MarketplaceClient } from 'src/domain/marketplace/application/ports/marketplace-client.port';
import { getAyunisMarketplaceAPI } from 'src/common/clients/marketplace/generated/ayunisMarketplaceAPI';
import {
  IntegrationResponseDto,
  SkillListResponseDto,
  SkillResponseDto,
} from 'src/common/clients/marketplace/generated/ayunisMarketplaceAPI.schemas';
import { MarketplaceHttpError } from 'src/common/clients/marketplace/client';
import { MarketplaceUnavailableError } from 'src/domain/marketplace/application/marketplace.errors';

@Injectable()
export class MarketplaceHttpClient extends MarketplaceClient {
  private readonly logger = new Logger(MarketplaceHttpClient.name);

  constructor() {
    super();
  }

  private readonly api = getAyunisMarketplaceAPI();

  async getSkillByIdentifier(
    identifier: string,
  ): Promise<SkillResponseDto | null> {
    try {
      return await this.api.publicSkillsControllerGetByIdentifier(identifier);
    } catch (error) {
      if (error instanceof MarketplaceHttpError && error.status === 404) {
        this.logger.debug({ identifier }, 'Marketplace skill not found');
        return null;
      }
      this.logger.warn(
        {
          identifier,
          err: error as Error,
          status:
            error instanceof MarketplaceHttpError ? error.status : undefined,
        },
        'Failed to fetch marketplace skill',
      );
      throw error;
    }
  }

  async getPreInstalledSkills(): Promise<SkillListResponseDto[]> {
    try {
      return await this.api.publicSkillsControllerListPreInstalled();
    } catch (error) {
      this.logger.warn(
        {
          err: error as Error,
          status:
            error instanceof MarketplaceHttpError ? error.status : undefined,
        },
        'Failed to fetch pre-installed marketplace skills',
      );
      throw error;
    }
  }

  async getIntegrationByIdentifier(
    identifier: string,
  ): Promise<IntegrationResponseDto | null> {
    try {
      return await this.api.publicIntegrationsControllerGetByIdentifier(
        identifier,
      );
    } catch (error) {
      if (error instanceof MarketplaceHttpError && error.status === 404) {
        this.logger.debug({ identifier }, 'Marketplace integration not found');
        return null;
      }
      this.logger.warn(
        {
          identifier,
          err: error as Error,
          status:
            error instanceof MarketplaceHttpError ? error.status : undefined,
        },
        'Failed to fetch marketplace integration',
      );
      throw new MarketplaceUnavailableError();
    }
  }
}
