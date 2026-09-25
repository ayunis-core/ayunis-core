import type { UUID } from 'crypto';
import type { ContextService } from 'src/common/context/services/context.service';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import type { SkillRepository } from 'src/domain/skills/application/ports/skill.repository';
import { PersonalSkill } from 'src/domain/skills/domain/personal-skill.entity';
import { FindInstalledMarketplaceSkillQuery } from './find-installed-marketplace-skill.query';
import { FindInstalledMarketplaceSkillUseCase } from './find-installed-marketplace-skill.use-case';

const USER_ID = '11111111-1111-1111-1111-111111111111' as UUID;
const ORG_ID = '22222222-2222-2222-2222-222222222222' as UUID;

describe('FindInstalledMarketplaceSkillUseCase', () => {
  const findPersonalByMarketplaceIdentifier = jest.fn();
  const contextValues: Record<string, unknown> = {};
  const repository = {
    findPersonalByMarketplaceIdentifier,
  } as unknown as SkillRepository;
  const context = {
    get: jest.fn((key: string) => contextValues[key]),
  } as unknown as ContextService;
  const useCase = new FindInstalledMarketplaceSkillUseCase(repository, context);

  beforeEach(() => {
    findPersonalByMarketplaceIdentifier.mockReset();
    contextValues.userId = USER_ID;
    contextValues.orgId = ORG_ID;
  });

  it("returns the current user's skill installed from the marketplace entry", async () => {
    const installed = new PersonalSkill({
      name: 'Finanzsachbearbeitung',
      shortDescription: 'Hilft bei Haushaltsfragen',
      instructions: 'Frage nach der Haushaltsstelle.',
      userId: USER_ID,
      marketplaceIdentifier: 'finance-clerk',
    });
    findPersonalByMarketplaceIdentifier.mockResolvedValue(installed);

    const result = await useCase.execute(
      new FindInstalledMarketplaceSkillQuery('finance-clerk'),
    );

    expect(result).toBe(installed);
    expect(findPersonalByMarketplaceIdentifier).toHaveBeenCalledWith(
      USER_ID,
      'finance-clerk',
    );
  });

  it('returns null when the entry is not installed for this user', async () => {
    findPersonalByMarketplaceIdentifier.mockResolvedValue(null);

    await expect(
      useCase.execute(new FindInstalledMarketplaceSkillQuery('finance-clerk')),
    ).resolves.toBeNull();
  });

  it('refuses without an authenticated user', async () => {
    delete contextValues.userId;

    await expect(
      useCase.execute(new FindInstalledMarketplaceSkillQuery('finance-clerk')),
    ).rejects.toThrow(UnauthorizedAccessError);
    expect(findPersonalByMarketplaceIdentifier).not.toHaveBeenCalled();
  });
});
