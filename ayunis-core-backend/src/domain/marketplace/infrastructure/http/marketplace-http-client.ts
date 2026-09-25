import { Injectable, Logger } from '@nestjs/common';
import { MarketplaceClient } from 'src/domain/marketplace/application/ports/marketplace-client.port';
import { getAyunisMarketplaceAPI } from 'src/common/clients/marketplace/generated/ayunisMarketplaceAPI';
import {
  IntegrationListResponseDto,
  IntegrationResponseDto,
  SkillCategoryResponseDto,
  SkillListResponseDto,
  SkillResponseDto,
} from 'src/common/clients/marketplace/generated/ayunisMarketplaceAPI.schemas';
import { MarketplaceHttpError } from 'src/common/clients/marketplace/client';
import { MarketplaceUnavailableError } from 'src/domain/marketplace/application/marketplace.errors';

const CATALOGUE_PAGE_LIMIT = 100;

interface CataloguePage<T> {
  data: T[];
  totalPages: number;
}

interface PublishedEntry {
  published: boolean;
}

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

  listSkills(): Promise<SkillListResponseDto[]> {
    return this.listPublished('skills', (page) =>
      this.api.publicSkillsControllerList({
        page,
        limit: CATALOGUE_PAGE_LIMIT,
      }),
    );
  }

  listIntegrations(): Promise<IntegrationListResponseDto[]> {
    return this.listPublished('integrations', (page) =>
      this.api.publicIntegrationsControllerList({
        page,
        limit: CATALOGUE_PAGE_LIMIT,
      }),
    );
  }

  async listCategories(): Promise<SkillCategoryResponseDto[]> {
    try {
      return await this.api.publicSkillCategoriesControllerList();
    } catch (error) {
      throw this.unavailable(error, 'Failed to list marketplace categories');
    }
  }

  // The public list API only filters by category and featured flag, so the
  // whole catalogue is walked; the published check is defensive, the public
  // API is expected to return published entries only.
  private async listPublished<T extends PublishedEntry>(
    resource: string,
    fetchPage: (page: number) => Promise<CataloguePage<T>>,
  ): Promise<T[]> {
    try {
      const entries: T[] = [];
      let page = 1;
      let totalPages = 1;
      do {
        const result = await fetchPage(page);
        entries.push(...result.data);
        totalPages = result.totalPages;
        page += 1;
      } while (page <= totalPages);
      return entries.filter((entry) => entry.published);
    } catch (error) {
      throw this.unavailable(error, `Failed to list marketplace ${resource}`);
    }
  }

  private unavailable(
    error: unknown,
    message: string,
  ): MarketplaceUnavailableError {
    this.logger.warn(
      {
        err: error as Error,
        status:
          error instanceof MarketplaceHttpError ? error.status : undefined,
      },
      message,
    );
    return new MarketplaceUnavailableError();
  }
}
