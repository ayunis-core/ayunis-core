import { randomUUID } from 'crypto';
import type { ContextService } from 'src/common/context/services/context.service';
import { getFromUserContext } from 'src/common/context/testing/context.fixtures';
import type { FindKnowledgeBasesByIdsUseCase } from 'src/domain/knowledge-bases/application/use-cases/find-knowledge-bases-by-ids/find-knowledge-bases-by-ids.use-case';
import { OrgKnowledgeBase } from 'src/domain/knowledge-bases/domain/org-knowledge-base.entity';
import { PersonalKnowledgeBase } from 'src/domain/knowledge-bases/domain/personal-knowledge-base.entity';
import { TeamKnowledgeBase } from 'src/domain/knowledge-bases/domain/team-knowledge-base.entity';
import type { SkillRepository } from 'src/domain/skills/application/ports/skill.repository';
import { OrgSkill } from 'src/domain/skills/domain/org-skill.entity';
import { PersonalSkill } from 'src/domain/skills/domain/personal-skill.entity';
import { TeamSkill } from 'src/domain/skills/domain/team-skill.entity';
import { SkillOwnerChangeService } from './skill-owner-change.service';

describe(SkillOwnerChangeService.name, () => {
  const userId = randomUUID();
  const orgId = randomUUID();
  const teamId = randomUUID();
  const personalKb = new PersonalKnowledgeBase({
    name: 'Notes',
    orgId,
    userId,
  });
  const teamKb = new TeamKnowledgeBase({ name: 'Statutes', orgId, teamId });
  const orgKb = new OrgKnowledgeBase({ name: 'Bylaws', orgId });
  const params = {
    name: 'Council minutes',
    shortDescription: 'Drafts minutes.',
    instructions: 'Summarise.',
    sourceIds: [randomUUID()],
    mcpIntegrationIds: [randomUUID()],
    knowledgeBaseIds: [personalKb.id, teamKb.id, orgKb.id],
  };

  function setup(state = { isActive: true, isPinned: true }) {
    const repository = {
      isSkillActive: jest.fn().mockResolvedValue(state.isActive),
      isSkillPinned: jest.fn().mockResolvedValue(state.isPinned),
    };
    const findKnowledgeBases = {
      execute: jest.fn().mockResolvedValue([personalKb, teamKb, orgKb]),
    };
    const service = new SkillOwnerChangeService(
      repository as unknown as SkillRepository,
      findKnowledgeBases as unknown as FindKnowledgeBasesByIdsUseCase,
      {
        get: jest.fn(getFromUserContext({ userId, orgId })),
      } as unknown as ContextService,
    );
    return { repository, service };
  }

  it('moves a personal skill to a team with the mover state and same-team links only', async () => {
    const skill = new PersonalSkill({ ...params, userId });
    const { service } = setup();

    const plan = await service.plan(skill, { type: 'team', teamId });

    expect(plan.changed).toBe(true);
    expect(plan.target).toBeInstanceOf(TeamSkill);
    expect(plan.target).toMatchObject({
      id: skill.id,
      name: skill.name,
      teamId,
      isActive: true,
      isPinned: true,
      sourceIds: params.sourceIds,
      mcpIntegrationIds: params.mcpIntegrationIds,
      knowledgeBaseIds: [teamKb.id],
    });
    expect(plan.unlinkedKnowledgeBaseIds).toEqual([personalKb.id, orgKb.id]);
  });

  it('keeps the global state when moving from a team to the organization', async () => {
    const skill = new TeamSkill({ ...params, teamId, isActive: false });
    const { service, repository } = setup();

    const plan = await service.plan(skill, { type: 'org' });

    expect(plan.target).toBeInstanceOf(OrgSkill);
    expect(plan.target).toMatchObject({ orgId, isActive: false });
    expect(plan.unlinkedKnowledgeBaseIds).toEqual([personalKb.id, teamKb.id]);
    expect(repository.isSkillActive).not.toHaveBeenCalled();
  });

  it('moves a team skill to the mover personally', async () => {
    const skill = new TeamSkill({ ...params, teamId, isActive: true });
    const { service } = setup();

    const plan = await service.plan(skill, { type: 'personal' });

    expect(plan.target).toBeInstanceOf(PersonalSkill);
    expect(plan.target).toMatchObject({
      userId,
      knowledgeBaseIds: [personalKb.id],
    });
  });

  it('drops links to knowledge bases that no longer exist', async () => {
    const skill = new PersonalSkill({
      ...params,
      userId,
      knowledgeBaseIds: [randomUUID()],
    });
    const { service } = setup();

    const plan = await service.plan(skill, { type: 'org' });

    expect(plan.target.knowledgeBaseIds).toEqual([]);
    expect(plan.unlinkedKnowledgeBaseIds).toEqual(skill.knowledgeBaseIds);
  });

  it.each([
    [
      'personal',
      new PersonalSkill({ ...params, userId }),
      { type: 'personal' as const },
    ],
    [
      'team',
      new TeamSkill({ ...params, teamId }),
      { type: 'team' as const, teamId },
    ],
    ['org', new OrgSkill({ ...params, orgId }), { type: 'org' as const }],
  ])('reports no change for the current %s owner', async (_, skill, owner) => {
    const { service } = setup();

    await expect(service.plan(skill, owner)).resolves.toMatchObject({
      changed: false,
      unlinkedKnowledgeBaseIds: [],
    });
  });
});
