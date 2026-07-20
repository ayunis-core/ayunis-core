import type { UUID } from 'crypto';
import { ListOrgAddonsUseCase } from './list-org-addons.use-case';
import { ListOrgAddonsQuery } from './list-org-addons.query';
import type { OrgAddonRepository } from '../../ports/org-addon.repository';
import { OrgAddon } from 'src/iam/addons/domain/org-addon.entity';
import { AddonType } from 'src/iam/addons/domain/value-objects/addon-type.enum';
import { UnexpectedAddonError } from '../../addons.errors';

const ORG_ID = '11111111-1111-1111-1111-111111111111' as UUID;

function makeRepo(active: OrgAddon[]): OrgAddonRepository {
  return {
    findAllByOrgId: jest.fn(async () => active),
    findByOrgAndType: jest.fn(),
    create: jest.fn(),
    delete: jest.fn(),
  };
}

describe('ListOrgAddonsUseCase', () => {
  it('returns the full addon catalog with active=false when the org has no addons', async () => {
    const useCase = new ListOrgAddonsUseCase(makeRepo([]));

    const result = await useCase.execute(new ListOrgAddonsQuery(ORG_ID));

    expect(result).toEqual(
      Object.values(AddonType).map((type) => ({ type, active: false })),
    );
  });

  it('marks an addon as active when a row exists for the org', async () => {
    const academy = new OrgAddon({
      orgId: ORG_ID,
      type: AddonType.AYUNIS_CORE_ACADEMY,
    });
    const useCase = new ListOrgAddonsUseCase(makeRepo([academy]));

    const result = await useCase.execute(new ListOrgAddonsQuery(ORG_ID));

    expect(result).toContainEqual({
      type: AddonType.AYUNIS_CORE_ACADEMY,
      active: true,
    });
  });

  it('wraps repository failures in UnexpectedAddonError', async () => {
    const repo = makeRepo([]);
    (repo.findAllByOrgId as jest.Mock).mockRejectedValue(
      new Error('connection refused'),
    );
    const useCase = new ListOrgAddonsUseCase(repo);

    await expect(
      useCase.execute(new ListOrgAddonsQuery(ORG_ID)),
    ).rejects.toBeInstanceOf(UnexpectedAddonError);
  });
});
