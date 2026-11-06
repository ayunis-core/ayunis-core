jest.mock('@nestjs-cls/transactional', () => ({
  Transactional: () => (_t: unknown, _p: string, d: PropertyDescriptor) => d,
}));

import { randomUUID } from 'crypto';
import type { EventEmitter2 } from '@nestjs/event-emitter';
import type { ContextService } from 'src/common/context/services/context.service';
import { getFromUserContext } from 'src/common/context/testing/context.fixtures';
import { ShareDeletedEvent } from 'src/domain/shares/application/events/share-deleted.event';
import type { SharesRepository } from 'src/domain/shares/application/ports/shares-repository.port';
import { SkillShare } from 'src/domain/shares/domain/share.entity';
import { OrgShareScope } from 'src/domain/shares/domain/share-scope.entity';
import { ShareScopeType } from 'src/domain/shares/domain/value-objects/share-scope-type.enum';
import { SharedEntityType } from 'src/domain/shares/domain/value-objects/shared-entity-type.enum';
import { RemoveEntitySharesCommand } from './remove-entity-shares.command';
import { RemoveEntitySharesUseCase } from './remove-entity-shares.use-case';

describe(RemoveEntitySharesUseCase.name, () => {
  const orgId = randomUUID();
  const ownerId = randomUUID();
  const skillId = randomUUID();
  const teamId = randomUUID();

  function setup(shares: SkillShare[]) {
    const repository = {
      findByEntityIdAndType: jest.fn().mockResolvedValue(shares),
      delete: jest.fn(),
    };
    const events = { emitAsync: jest.fn().mockResolvedValue([]) };
    const useCase = new RemoveEntitySharesUseCase(
      repository as unknown as SharesRepository,
      {
        get: jest.fn(getFromUserContext({ orgId })),
      } as unknown as ContextService,
      events as unknown as EventEmitter2,
    );
    return { repository, events, useCase };
  }

  const command = new RemoveEntitySharesCommand(
    SharedEntityType.SKILL,
    skillId,
    ownerId,
    [{ scopeType: ShareScopeType.TEAM, scopeId: teamId }],
  );

  it('deletes every share of the entity and reports the remaining audience', async () => {
    const share = new SkillShare({
      skillId,
      ownerId,
      scope: new OrgShareScope({ orgId }),
    });
    const { useCase, repository, events } = setup([share]);

    await useCase.execute(command);

    expect(repository.findByEntityIdAndType).toHaveBeenCalledWith(
      skillId,
      SharedEntityType.SKILL,
    );
    expect(repository.delete).toHaveBeenCalledWith(share);
    expect(events.emitAsync).toHaveBeenCalledWith(
      ShareDeletedEvent.EVENT_NAME,
      new ShareDeletedEvent(SharedEntityType.SKILL, skillId, ownerId, orgId, [
        { scopeType: ShareScopeType.TEAM, scopeId: teamId },
      ]),
    );
  });

  it('still reconciles access when the entity had no shares', async () => {
    const { useCase, repository, events } = setup([]);

    await useCase.execute(command);

    expect(repository.delete).not.toHaveBeenCalled();
    expect(events.emitAsync).toHaveBeenCalledTimes(1);
  });
});
