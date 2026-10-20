import { randomUUID } from 'crypto';
import { SyncAcademyAddonUseCase } from './sync-academy-addon.use-case';
import type { OrgAddon } from 'src/iam/addons/domain/org-addon.entity';
import type { OrgAddonRepository } from 'src/iam/addons/application/ports/org-addon.repository';

describe('Synchronizing Academy entitlement without a user principal', () => {
  const orgId = randomUUID();
  let stored: OrgAddon | null;
  let useCase: SyncAcademyAddonUseCase;

  beforeEach(() => {
    stored = null;
    useCase = new SyncAcademyAddonUseCase({
      findByOrgAndType: async () => stored,
      create: async (addon: OrgAddon) => {
        stored = addon;
        return addon;
      },
      delete: async () => {
        stored = null;
      },
    } as unknown as OrgAddonRepository);
  });

  it('activates Academy and returns a system-authored event for publication after commit', async () => {
    const events = await useCase.execute({ orgId, active: true });
    expect(stored).toMatchObject({ orgId, type: 'ayunis_core_academy' });
    expect(events).toMatchObject([
      { name: 'addon.activated', event: { orgId, actorUserId: null } },
    ]);
  });

  it('does not change or re-emit an already active entitlement', async () => {
    await useCase.execute({ orgId, active: true });
    const before = stored;
    expect(await useCase.execute({ orgId, active: true })).toEqual([]);
    expect(stored).toBe(before);
  });

  it('deactivates Academy and allows later reactivation', async () => {
    await useCase.execute({ orgId, active: true });
    expect(await useCase.execute({ orgId, active: false })).toMatchObject([
      { name: 'addon.deactivated' },
    ]);
    expect(stored).toBeNull();
    expect(await useCase.execute({ orgId, active: false })).toEqual([]);
    expect(await useCase.execute({ orgId, active: true })).toMatchObject([
      { name: 'addon.activated' },
    ]);
  });
});
