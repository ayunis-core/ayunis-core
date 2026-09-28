import {
  MarketplaceUnavailableError,
  UnexpectedMarketplaceError,
} from 'src/domain/marketplace/application/marketplace.errors';
import {
  aMarketplaceSkillListEntry,
  createMockMarketplaceClient,
} from 'src/domain/marketplace/application/testing/marketplace.fixtures';
import { ListMarketplaceSkillsUseCase } from './list-marketplace-skills.use-case';

describe('ListMarketplaceSkillsUseCase', () => {
  let marketplaceClient: ReturnType<typeof createMockMarketplaceClient>;
  let useCase: ListMarketplaceSkillsUseCase;

  beforeEach(() => {
    marketplaceClient = createMockMarketplaceClient();
    useCase = new ListMarketplaceSkillsUseCase(marketplaceClient);
  });

  it('lists featured skills before the rest and sorts the rest by name', async () => {
    marketplaceClient.listSkills.mockResolvedValue([
      aMarketplaceSkillListEntry({
        identifier: 'zoning',
        name: 'Zuständigkeit',
      }),
      aMarketplaceSkillListEntry({
        identifier: 'minutes',
        name: 'Ärger melden',
      }),
      aMarketplaceSkillListEntry({
        identifier: 'finance-clerk',
        name: 'Finanzsachbearbeitung',
        featured: true,
      }),
    ]);

    const skills = await useCase.execute();

    expect(skills.map((skill) => skill.identifier)).toEqual([
      'finance-clerk',
      'minutes',
      'zoning',
    ]);
  });

  it('returns the generated marketplace DTOs unchanged', async () => {
    const skill = aMarketplaceSkillListEntry({ identifier: 'finance-clerk' });
    marketplaceClient.listSkills.mockResolvedValue([skill]);

    await expect(useCase.execute()).resolves.toEqual([skill]);
  });

  it('propagates marketplace unavailability unchanged', async () => {
    marketplaceClient.listSkills.mockRejectedValue(
      new MarketplaceUnavailableError(),
    );

    await expect(useCase.execute()).rejects.toBeInstanceOf(
      MarketplaceUnavailableError,
    );
  });

  it('wraps unexpected failures in the module error', async () => {
    marketplaceClient.listSkills.mockRejectedValue(new Error('boom'));

    await expect(useCase.execute()).rejects.toBeInstanceOf(
      UnexpectedMarketplaceError,
    );
  });
});
