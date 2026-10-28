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
import {
  MarketplaceRequestRejectedError,
  MarketplaceUnavailableError,
} from 'src/domain/marketplace/application/marketplace.errors';

const CATALOGUE_PAGE_LIMIT = 100;

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

  // The chat search tool hands the model the complete published catalogue and
  // lets the model pick, because the marketplace API offers no text search,
  // only category and featured filters. Its list endpoints are paginated with
  // no "all" option and default to 10 per page, so a single request would
  // silently return only the first page. Both list methods therefore walk
  // every page and drop unpublished entries defensively.
  //
  // This is fine for a catalogue of dozens (~60 entries, ~10k tokens per tool
  // call today) but does not scale to thousands: the result would exceed the
  // model's context. Once the catalogue nears ~150 entries, the marketplace
  // should grow a search endpoint and the tool should send a query instead.
  async listSkills(): Promise<SkillListResponseDto[]> {
    try {
      const skills: SkillListResponseDto[] = [];
      for (let page = 1, totalPages = 1; page <= totalPages; page += 1) {
        const result = await this.api.publicSkillsControllerList({
          page,
          limit: CATALOGUE_PAGE_LIMIT,
        });
        skills.push(...result.data);
        totalPages = result.totalPages;
      }
      return skills.filter((skill) => skill.published);
    } catch (error) {
      throw this.classifyListFailure(
        error,
        'Failed to list marketplace skills',
      );
    }
  }

  async listIntegrations(): Promise<IntegrationListResponseDto[]> {
    try {
      const integrations: IntegrationListResponseDto[] = [];
      for (let page = 1, totalPages = 1; page <= totalPages; page += 1) {
        const result = await this.api.publicIntegrationsControllerList({
          page,
          limit: CATALOGUE_PAGE_LIMIT,
        });
        integrations.push(...result.data);
        totalPages = result.totalPages;
      }
      return integrations.filter((integration) => integration.published);
    } catch (error) {
      throw this.classifyListFailure(
        error,
        'Failed to list marketplace integrations',
      );
    }
  }

  async listCategories(): Promise<SkillCategoryResponseDto[]> {
    try {
      return await this.api.publicSkillCategoriesControllerList();
    } catch (error) {
      throw this.classifyListFailure(
        error,
        'Failed to list marketplace categories',
      );
    }
  }

  // A 4xx means the marketplace is up but rejected our request, so our client
  // no longer matches its API. That needs a code fix and must alert, unlike
  // transport failures and 5xx, which are outages that resolve on their own.
  private classifyListFailure(
    error: unknown,
    message: string,
  ): MarketplaceRequestRejectedError | MarketplaceUnavailableError {
    const status =
      error instanceof MarketplaceHttpError ? error.status : undefined;
    if (status !== undefined && status >= 400 && status < 500) {
      this.logger.error({ err: error as Error, status }, message);
      return new MarketplaceRequestRejectedError(status);
    }
    this.logger.warn({ err: error as Error, status }, message);
    return new MarketplaceUnavailableError();
  }
}
