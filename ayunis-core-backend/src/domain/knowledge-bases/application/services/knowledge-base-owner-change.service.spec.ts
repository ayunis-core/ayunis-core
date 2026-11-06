import { randomUUID } from 'crypto';
import type { ContextService } from 'src/common/context/services/context.service';
import { getFromUserContext } from 'src/common/context/testing/context.fixtures';
import type { KnowledgeBaseRepository } from 'src/domain/knowledge-bases/application/ports/knowledge-base.repository';
import { OrgKnowledgeBase } from 'src/domain/knowledge-bases/domain/org-knowledge-base.entity';
import { PersonalKnowledgeBase } from 'src/domain/knowledge-bases/domain/personal-knowledge-base.entity';
import { TeamKnowledgeBase } from 'src/domain/knowledge-bases/domain/team-knowledge-base.entity';
import { KnowledgeBaseOwnerChangeService } from './knowledge-base-owner-change.service';

describe(KnowledgeBaseOwnerChangeService.name, () => {
  const userId = randomUUID();
  const orgId = randomUUID();
  const teamId = randomUUID();

  function setup(isActive = true) {
    const repository = { isActive: jest.fn().mockResolvedValue(isActive) };
    const service = new KnowledgeBaseOwnerChangeService(
      repository as unknown as KnowledgeBaseRepository,
      {
        get: jest.fn(getFromUserContext({ userId, orgId })),
      } as unknown as ContextService,
    );
    return { repository, service };
  }

  it('moves a personal knowledge base to a team with the mover activation', async () => {
    const knowledgeBase = new PersonalKnowledgeBase({
      name: 'Bauordnung',
      description: 'Regeln',
      orgId,
      userId,
    });
    const { service, repository } = setup(true);

    const plan = await service.plan(knowledgeBase, { type: 'team', teamId });

    expect(repository.isActive).toHaveBeenCalledWith(knowledgeBase.id, userId);
    expect(plan.changed).toBe(true);
    expect(plan.target).toBeInstanceOf(TeamKnowledgeBase);
    expect(plan.target).toMatchObject({
      id: knowledgeBase.id,
      name: 'Bauordnung',
      description: 'Regeln',
      orgId,
      teamId,
      isActive: true,
    });
  });

  it('keeps the global state when moving from the organization to a team', async () => {
    const knowledgeBase = new OrgKnowledgeBase({
      name: 'Satzungen',
      orgId,
      isActive: false,
    });
    const { service, repository } = setup();

    const plan = await service.plan(knowledgeBase, { type: 'team', teamId });

    expect(plan.target).toMatchObject({ teamId, isActive: false });
    expect(repository.isActive).not.toHaveBeenCalled();
  });

  it('moves a team knowledge base to the mover personally', async () => {
    const knowledgeBase = new TeamKnowledgeBase({
      name: 'Bauordnung',
      orgId,
      teamId,
    });
    const { service } = setup();

    const plan = await service.plan(knowledgeBase, { type: 'personal' });

    expect(plan.target).toBeInstanceOf(PersonalKnowledgeBase);
    expect(plan.target).toMatchObject({ userId });
  });

  it('reports no change for the current owner', async () => {
    const knowledgeBase = new TeamKnowledgeBase({
      name: 'Bauordnung',
      orgId,
      teamId,
    });
    const { service } = setup();

    await expect(
      service.plan(knowledgeBase, { type: 'team', teamId }),
    ).resolves.toEqual({ changed: false, target: knowledgeBase });
  });
});
