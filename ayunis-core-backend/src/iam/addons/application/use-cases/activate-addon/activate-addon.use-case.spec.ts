import type { UUID } from 'crypto';
import type { EventEmitter2 } from '@nestjs/event-emitter';
import { ActivateAddonUseCase } from './activate-addon.use-case';
import { ActivateAddonCommand } from './activate-addon.command';
import type { OrgAddonRepository } from '../../ports/org-addon.repository';
import { OrgAddon } from '../../../domain/org-addon.entity';
import { AddonType } from '../../../domain/value-objects/addon-type.enum';
import { AddonActivatedEvent } from '../../events/addon-activated.event';
import { UnexpectedAddonError } from '../../addons.errors';

const ORG_ID = '11111111-1111-1111-1111-111111111111' as UUID;
const SUPER_ADMIN_ID = '99999999-9999-9999-9999-999999999999' as UUID;

function makeRepo(existing: OrgAddon | null): OrgAddonRepository {
  return {
    findAllByOrgId: jest.fn(),
    findByOrgAndType: jest.fn(async () => existing),
    create: jest.fn(async (addon: OrgAddon) => addon),
    delete: jest.fn(),
  };
}

function makeEventEmitter(): EventEmitter2 {
  return { emitAsync: jest.fn(async () => []) } as unknown as EventEmitter2;
}

describe('ActivateAddonUseCase', () => {
  it('creates the addon row and emits addon.activated when the addon is inactive', async () => {
    const repo = makeRepo(null);
    const eventEmitter = makeEventEmitter();
    const useCase = new ActivateAddonUseCase(repo, eventEmitter);

    await useCase.execute(
      new ActivateAddonCommand(
        ORG_ID,
        AddonType.AYUNIS_CORE_ACADEMY,
        SUPER_ADMIN_ID,
      ),
    );

    expect(repo.create).toHaveBeenCalledTimes(1);
    const created = (repo.create as jest.Mock).mock.calls[0][0] as OrgAddon;
    expect(created.orgId).toBe(ORG_ID);
    expect(created.type).toBe(AddonType.AYUNIS_CORE_ACADEMY);
    expect(eventEmitter.emitAsync).toHaveBeenCalledWith(
      AddonActivatedEvent.EVENT_NAME,
      new AddonActivatedEvent(
        ORG_ID,
        AddonType.AYUNIS_CORE_ACADEMY,
        SUPER_ADMIN_ID,
      ),
    );
  });

  it('is a no-op without an event when the addon is already active', async () => {
    const existing = new OrgAddon({
      orgId: ORG_ID,
      type: AddonType.AYUNIS_CORE_ACADEMY,
    });
    const repo = makeRepo(existing);
    const eventEmitter = makeEventEmitter();
    const useCase = new ActivateAddonUseCase(repo, eventEmitter);

    await useCase.execute(
      new ActivateAddonCommand(
        ORG_ID,
        AddonType.AYUNIS_CORE_ACADEMY,
        SUPER_ADMIN_ID,
      ),
    );

    expect(repo.create).not.toHaveBeenCalled();
    expect(eventEmitter.emitAsync).not.toHaveBeenCalled();
  });

  it('wraps repository failures in UnexpectedAddonError', async () => {
    const repo = makeRepo(null);
    (repo.create as jest.Mock).mockRejectedValue(
      new Error('unique constraint violation'),
    );
    const useCase = new ActivateAddonUseCase(repo, makeEventEmitter());

    await expect(
      useCase.execute(
        new ActivateAddonCommand(
          ORG_ID,
          AddonType.AYUNIS_CORE_ACADEMY,
          SUPER_ADMIN_ID,
        ),
      ),
    ).rejects.toBeInstanceOf(UnexpectedAddonError);
  });
});
