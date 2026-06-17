import type { UUID } from 'crypto';
import type { EventEmitter2 } from '@nestjs/event-emitter';
import { DeactivateAddonUseCase } from './deactivate-addon.use-case';
import { DeactivateAddonCommand } from './deactivate-addon.command';
import type { OrgAddonRepository } from '../../ports/org-addon.repository';
import { OrgAddon } from '../../../domain/org-addon.entity';
import { AddonType } from '../../../domain/value-objects/addon-type.enum';
import { AddonDeactivatedEvent } from '../../events/addon-deactivated.event';
import { UnexpectedAddonError } from '../../addons.errors';

const ORG_ID = '11111111-1111-1111-1111-111111111111' as UUID;
const SUPER_ADMIN_ID = '99999999-9999-9999-9999-999999999999' as UUID;

function makeRepo(existing: OrgAddon | null): OrgAddonRepository {
  return {
    findAllByOrgId: jest.fn(),
    findByOrgAndType: jest.fn(async () => existing),
    create: jest.fn(),
    delete: jest.fn(),
  };
}

function makeEventEmitter(): EventEmitter2 {
  return { emitAsync: jest.fn(async () => []) } as unknown as EventEmitter2;
}

describe('DeactivateAddonUseCase', () => {
  it('deletes the addon row and emits addon.deactivated when the addon is active', async () => {
    const existing = new OrgAddon({
      orgId: ORG_ID,
      type: AddonType.AYUNIS_CORE_ACADEMY,
    });
    const repo = makeRepo(existing);
    const eventEmitter = makeEventEmitter();
    const useCase = new DeactivateAddonUseCase(repo, eventEmitter);

    await useCase.execute(
      new DeactivateAddonCommand(
        ORG_ID,
        AddonType.AYUNIS_CORE_ACADEMY,
        SUPER_ADMIN_ID,
      ),
    );

    expect(repo.delete).toHaveBeenCalledWith(existing.id);
    expect(eventEmitter.emitAsync).toHaveBeenCalledWith(
      AddonDeactivatedEvent.EVENT_NAME,
      new AddonDeactivatedEvent(
        ORG_ID,
        AddonType.AYUNIS_CORE_ACADEMY,
        SUPER_ADMIN_ID,
      ),
    );
  });

  it('is a no-op without an event when the addon is already inactive', async () => {
    const repo = makeRepo(null);
    const eventEmitter = makeEventEmitter();
    const useCase = new DeactivateAddonUseCase(repo, eventEmitter);

    await useCase.execute(
      new DeactivateAddonCommand(
        ORG_ID,
        AddonType.AYUNIS_CORE_ACADEMY,
        SUPER_ADMIN_ID,
      ),
    );

    expect(repo.delete).not.toHaveBeenCalled();
    expect(eventEmitter.emitAsync).not.toHaveBeenCalled();
  });

  it('wraps repository failures in UnexpectedAddonError', async () => {
    const existing = new OrgAddon({
      orgId: ORG_ID,
      type: AddonType.AYUNIS_CORE_ACADEMY,
    });
    const repo = makeRepo(existing);
    (repo.delete as jest.Mock).mockRejectedValue(new Error('deadlock'));
    const useCase = new DeactivateAddonUseCase(repo, makeEventEmitter());

    await expect(
      useCase.execute(
        new DeactivateAddonCommand(
          ORG_ID,
          AddonType.AYUNIS_CORE_ACADEMY,
          SUPER_ADMIN_ID,
        ),
      ),
    ).rejects.toBeInstanceOf(UnexpectedAddonError);
  });
});
