import {
  MarketplaceUnavailableError,
  UnexpectedMarketplaceError,
} from 'src/domain/marketplace/application/marketplace.errors';
import {
  aMarketplaceIntegrationListEntry,
  aMarketplaceSkillCategory,
  aMarketplaceSkillListEntry,
  createMockMarketplaceClient,
  TEST_SKILL_CATEGORY_ID,
} from 'src/domain/marketplace/application/testing/marketplace.fixtures';
import { ListMarketplaceCatalogueQuery } from './list-marketplace-catalogue.query';
import { ListMarketplaceCatalogueUseCase } from './list-marketplace-catalogue.use-case';

describe('ListMarketplaceCatalogueUseCase', () => {
  let marketplaceClient: ReturnType<typeof createMockMarketplaceClient>;
  let useCase: ListMarketplaceCatalogueUseCase;

  beforeEach(() => {
    marketplaceClient = createMockMarketplaceClient();
    marketplaceClient.listSkills.mockResolvedValue([
      aMarketplaceSkillListEntry({
        identifier: 'meeting-minutes',
        name: 'Sitzungsprotokoll',
        shortDescription: 'Erstellt Protokolle',
        skillCategoryId: 'unknown-category',
      }),
      aMarketplaceSkillListEntry({
        identifier: 'finance-clerk',
        name: 'Finanzsachbearbeitung',
        shortDescription: 'Hilft bei Haushaltsfragen',
        skillCategoryId: TEST_SKILL_CATEGORY_ID,
        featured: true,
      }),
    ]);
    marketplaceClient.listIntegrations.mockResolvedValue([
      aMarketplaceIntegrationListEntry({
        identifier: 'council-data',
        name: 'Ratsinformationssystem',
        shortDescription: 'Zugriff auf Beschlüsse',
      }),
    ]);
    marketplaceClient.listCategories.mockResolvedValue([
      aMarketplaceSkillCategory({ name: 'Finanzen' }),
    ]);
    useCase = new ListMarketplaceCatalogueUseCase(marketplaceClient);
  });

  it('returns skills and integrations as typed entries with category names', async () => {
    const entries = await useCase.execute(new ListMarketplaceCatalogueQuery());

    expect(entries).toEqual([
      {
        type: 'skill',
        identifier: 'finance-clerk',
        name: 'Finanzsachbearbeitung',
        shortDescription: 'Hilft bei Haushaltsfragen',
        category: 'Finanzen',
        featured: true,
      },
      {
        type: 'skill',
        identifier: 'meeting-minutes',
        name: 'Sitzungsprotokoll',
        shortDescription: 'Erstellt Protokolle',
        category: null,
        featured: false,
      },
      {
        type: 'integration',
        identifier: 'council-data',
        name: 'Ratsinformationssystem',
        shortDescription: 'Zugriff auf Beschlüsse',
        category: null,
        featured: false,
      },
    ]);
  });

  it('lists featured skills before the rest and sorts the rest by name', async () => {
    marketplaceClient.listSkills.mockResolvedValue([
      aMarketplaceSkillListEntry({ identifier: 'zeta', name: 'Zeta' }),
      aMarketplaceSkillListEntry({ identifier: 'alpha', name: 'Alpha' }),
      aMarketplaceSkillListEntry({
        identifier: 'star',
        name: 'Star',
        featured: true,
      }),
    ]);

    const entries = await useCase.execute(
      new ListMarketplaceCatalogueQuery({ type: 'skill' }),
    );

    expect(entries.map((entry) => entry.identifier)).toEqual([
      'star',
      'alpha',
      'zeta',
    ]);
  });

  it('returns only skills when asked for skills and skips the integration call', async () => {
    const entries = await useCase.execute(
      new ListMarketplaceCatalogueQuery({ type: 'skill' }),
    );

    expect(entries.every((entry) => entry.type === 'skill')).toBe(true);
    expect(entries).toHaveLength(2);
    expect(marketplaceClient.listIntegrations).not.toHaveBeenCalled();
  });

  it('returns only integrations when asked for integrations', async () => {
    const entries = await useCase.execute(
      new ListMarketplaceCatalogueQuery({ type: 'integration' }),
    );

    expect(entries).toEqual([
      expect.objectContaining({
        type: 'integration',
        identifier: 'council-data',
      }),
    ]);
    expect(marketplaceClient.listSkills).not.toHaveBeenCalled();
  });

  it('propagates marketplace unavailability unchanged', async () => {
    marketplaceClient.listSkills.mockRejectedValue(
      new MarketplaceUnavailableError(),
    );

    await expect(
      useCase.execute(new ListMarketplaceCatalogueQuery()),
    ).rejects.toThrow(MarketplaceUnavailableError);
  });

  it('wraps unexpected failures in the module error', async () => {
    marketplaceClient.listCategories.mockRejectedValue(
      new TypeError('cannot read categories'),
    );

    await expect(
      useCase.execute(new ListMarketplaceCatalogueQuery()),
    ).rejects.toThrow(UnexpectedMarketplaceError);
  });
});
