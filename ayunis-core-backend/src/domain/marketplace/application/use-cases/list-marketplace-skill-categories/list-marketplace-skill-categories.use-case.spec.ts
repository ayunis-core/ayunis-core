import {
  MarketplaceUnavailableError,
  UnexpectedMarketplaceError,
} from 'src/domain/marketplace/application/marketplace.errors';
import {
  aMarketplaceSkillCategory,
  createMockMarketplaceClient,
} from 'src/domain/marketplace/application/testing/marketplace.fixtures';
import { ListMarketplaceSkillCategoriesUseCase } from './list-marketplace-skill-categories.use-case';

describe('ListMarketplaceSkillCategoriesUseCase', () => {
  let marketplaceClient: ReturnType<typeof createMockMarketplaceClient>;
  let useCase: ListMarketplaceSkillCategoriesUseCase;

  beforeEach(() => {
    marketplaceClient = createMockMarketplaceClient();
    useCase = new ListMarketplaceSkillCategoriesUseCase(marketplaceClient);
  });

  it('returns the marketplace skill categories', async () => {
    const category = aMarketplaceSkillCategory({ name: 'Finanzen' });
    marketplaceClient.listCategories.mockResolvedValue([category]);

    await expect(useCase.execute()).resolves.toEqual([category]);
  });

  it('propagates marketplace unavailability unchanged', async () => {
    marketplaceClient.listCategories.mockRejectedValue(
      new MarketplaceUnavailableError(),
    );

    await expect(useCase.execute()).rejects.toBeInstanceOf(
      MarketplaceUnavailableError,
    );
  });

  it('wraps unexpected failures in the module error', async () => {
    marketplaceClient.listCategories.mockRejectedValue(new Error('boom'));

    await expect(useCase.execute()).rejects.toBeInstanceOf(
      UnexpectedMarketplaceError,
    );
  });
});
