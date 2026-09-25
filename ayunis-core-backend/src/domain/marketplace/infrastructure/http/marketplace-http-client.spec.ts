import { MarketplaceUnavailableError } from 'src/domain/marketplace/application/marketplace.errors';
import { MarketplaceHttpError } from 'src/common/clients/marketplace/client';
import { getAyunisMarketplaceAPI } from 'src/common/clients/marketplace/generated/ayunisMarketplaceAPI';
import {
  aMarketplaceIntegrationListEntry,
  aMarketplaceSkillCategory,
  aMarketplaceSkillListEntry,
} from 'src/domain/marketplace/application/testing/marketplace.fixtures';
import { MarketplaceHttpClient } from './marketplace-http-client';

jest.mock(
  'src/common/clients/marketplace/generated/ayunisMarketplaceAPI',
  () => ({ getAyunisMarketplaceAPI: jest.fn() }),
);

function page<T>(data: T[], pageNumber: number, totalPages: number) {
  return { data, total: data.length, page: pageNumber, limit: 100, totalPages };
}

describe('MarketplaceHttpClient', () => {
  const getIntegrationByIdentifier = jest.fn();
  const listSkills = jest.fn();
  const listIntegrations = jest.fn();
  const listCategories = jest.fn();

  beforeEach(() => {
    jest.mocked(getAyunisMarketplaceAPI).mockReturnValue({
      publicIntegrationsControllerGetByIdentifier: getIntegrationByIdentifier,
      publicSkillsControllerList: listSkills,
      publicIntegrationsControllerList: listIntegrations,
      publicSkillCategoriesControllerList: listCategories,
    } as unknown as ReturnType<typeof getAyunisMarketplaceAPI>);
    getIntegrationByIdentifier.mockReset();
    listSkills.mockReset();
    listIntegrations.mockReset();
    listCategories.mockReset();
  });

  it('classifies marketplace dependency failures as unavailable', async () => {
    getIntegrationByIdentifier.mockRejectedValue(
      new MarketplaceHttpError('Request failed with status code 502', 502),
    );
    const client = new MarketplaceHttpClient();

    await expect(
      client.getIntegrationByIdentifier('oparl-council-data'),
    ).rejects.toThrow(MarketplaceUnavailableError);
  });

  describe('listSkills', () => {
    it('walks every page of the catalogue', async () => {
      listSkills
        .mockResolvedValueOnce(
          page([aMarketplaceSkillListEntry({ identifier: 'first' })], 1, 2),
        )
        .mockResolvedValueOnce(
          page([aMarketplaceSkillListEntry({ identifier: 'second' })], 2, 2),
        );
      const client = new MarketplaceHttpClient();

      const skills = await client.listSkills();

      expect(skills.map((skill) => skill.identifier)).toEqual([
        'first',
        'second',
      ]);
      expect(listSkills).toHaveBeenCalledTimes(2);
      expect(listSkills).toHaveBeenNthCalledWith(1, { page: 1, limit: 100 });
      expect(listSkills).toHaveBeenNthCalledWith(2, { page: 2, limit: 100 });
    });

    it('drops unpublished entries even when the marketplace returns them', async () => {
      listSkills.mockResolvedValueOnce(
        page(
          [
            aMarketplaceSkillListEntry({ identifier: 'live', published: true }),
            aMarketplaceSkillListEntry({
              identifier: 'draft',
              published: false,
            }),
          ],
          1,
          1,
        ),
      );
      const client = new MarketplaceHttpClient();

      const skills = await client.listSkills();

      expect(skills.map((skill) => skill.identifier)).toEqual(['live']);
    });

    it('classifies list failures as unavailable', async () => {
      listSkills.mockRejectedValue(
        new MarketplaceHttpError('connect ECONNREFUSED', undefined, true),
      );
      const client = new MarketplaceHttpClient();

      await expect(client.listSkills()).rejects.toThrow(
        MarketplaceUnavailableError,
      );
    });
  });

  describe('listIntegrations', () => {
    it('returns published integrations across pages', async () => {
      listIntegrations
        .mockResolvedValueOnce(
          page(
            [
              aMarketplaceIntegrationListEntry({ identifier: 'published-one' }),
              aMarketplaceIntegrationListEntry({
                identifier: 'hidden',
                published: false,
              }),
            ],
            1,
            2,
          ),
        )
        .mockResolvedValueOnce(
          page(
            [aMarketplaceIntegrationListEntry({ identifier: 'published-two' })],
            2,
            2,
          ),
        );
      const client = new MarketplaceHttpClient();

      const integrations = await client.listIntegrations();

      expect(integrations.map((entry) => entry.identifier)).toEqual([
        'published-one',
        'published-two',
      ]);
    });

    it('classifies list failures as unavailable', async () => {
      listIntegrations.mockRejectedValue(
        new MarketplaceHttpError('Request failed with status code 503', 503),
      );
      const client = new MarketplaceHttpClient();

      await expect(client.listIntegrations()).rejects.toThrow(
        MarketplaceUnavailableError,
      );
    });
  });

  describe('listCategories', () => {
    it('returns the skill categories', async () => {
      listCategories.mockResolvedValue([
        aMarketplaceSkillCategory({ name: 'Finanzen' }),
      ]);
      const client = new MarketplaceHttpClient();

      const categories = await client.listCategories();

      expect(categories.map((category) => category.name)).toEqual(['Finanzen']);
    });

    it('classifies failures as unavailable', async () => {
      listCategories.mockRejectedValue(new Error('socket hang up'));
      const client = new MarketplaceHttpClient();

      await expect(client.listCategories()).rejects.toThrow(
        MarketplaceUnavailableError,
      );
    });
  });
});
