import { Injectable, Logger } from '@nestjs/common';
import type {
  IntegrationListResponseDto,
  SkillListResponseDto,
} from 'src/common/clients/marketplace/generated/ayunisMarketplaceAPI.schemas';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { UnexpectedMarketplaceError } from 'src/domain/marketplace/application/marketplace.errors';
import type { MarketplaceCatalogueEntry } from 'src/domain/marketplace/application/models/marketplace-catalogue-entry';
import { MarketplaceClient } from 'src/domain/marketplace/application/ports/marketplace-client.port';
import { ListMarketplaceCatalogueQuery } from './list-marketplace-catalogue.query';

@Injectable()
export class ListMarketplaceCatalogueUseCase {
  private readonly logger = new Logger(ListMarketplaceCatalogueUseCase.name);

  constructor(private readonly marketplaceClient: MarketplaceClient) {}

  @HandleUnexpectedErrors(UnexpectedMarketplaceError)
  async execute(
    query: ListMarketplaceCatalogueQuery,
  ): Promise<MarketplaceCatalogueEntry[]> {
    this.logger.log({ type: query.type ?? 'all' }, 'execute');

    const [skills, integrations] = await Promise.all([
      query.type === 'integration' ? [] : this.listSkillEntries(),
      query.type === 'skill' ? [] : this.listIntegrationEntries(),
    ]);

    // Grouped by type on purpose: the model presents skills and integrations
    // as different things (self-install vs. admin setup), so a merged ranking
    // would only interleave them.
    return [...skills, ...integrations];
  }

  private async listSkillEntries(): Promise<MarketplaceCatalogueEntry[]> {
    const [skills, categories] = await Promise.all([
      this.marketplaceClient.listSkills(),
      this.marketplaceClient.listCategories(),
    ]);
    const categoryNames = new Map(
      categories.map((category) => [category.id, category.name]),
    );
    return sortEntries(
      skills.map((skill) => toSkillEntry(skill, categoryNames)),
    );
  }

  private async listIntegrationEntries(): Promise<MarketplaceCatalogueEntry[]> {
    const integrations = await this.marketplaceClient.listIntegrations();
    return sortEntries(integrations.map(toIntegrationEntry));
  }
}

function toSkillEntry(
  skill: SkillListResponseDto,
  categoryNames: Map<string, string>,
): MarketplaceCatalogueEntry {
  return {
    type: 'skill',
    identifier: skill.identifier,
    name: skill.name,
    shortDescription: skill.shortDescription,
    category: skill.skillCategoryId
      ? (categoryNames.get(skill.skillCategoryId) ?? null)
      : null,
    featured: skill.featured,
  };
}

function toIntegrationEntry(
  integration: IntegrationListResponseDto,
): MarketplaceCatalogueEntry {
  return {
    type: 'integration',
    identifier: integration.identifier,
    name: integration.name,
    shortDescription: integration.shortDescription,
    category: null,
    featured: integration.featured,
  };
}

function sortEntries(
  entries: MarketplaceCatalogueEntry[],
): MarketplaceCatalogueEntry[] {
  return [...entries].sort(
    (a, b) =>
      Number(b.featured) - Number(a.featured) ||
      a.name.localeCompare(b.name, 'de'),
  );
}
