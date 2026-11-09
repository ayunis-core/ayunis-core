jest.mock('@nestjs-cls/transactional', () => ({
  Transactional: () => (_t: unknown, _p: string, d: PropertyDescriptor) => d,
}));

import { randomUUID } from 'crypto';
import { TeamKnowledgeBase } from 'src/domain/knowledge-bases/domain/team-knowledge-base.entity';
import type { SkillRepository } from 'src/domain/skills/application/ports/skill.repository';
import type { RemoveKnowledgeBaseAssignmentsByOriginSkillUseCase } from 'src/domain/threads/application/use-cases/remove-knowledge-base-assignments-by-origin-skill/remove-knowledge-base-assignments-by-origin-skill.use-case';
import { OrgSkill } from 'src/domain/skills/domain/org-skill.entity';
import { PersonalSkill } from 'src/domain/skills/domain/personal-skill.entity';
import { TeamSkill } from 'src/domain/skills/domain/team-skill.entity';
import { UnlinkKnowledgeBaseFromOtherOwnersCommand } from './unlink-knowledge-base-from-other-owners.command';
import { UnlinkKnowledgeBaseFromOtherOwnersUseCase } from './unlink-knowledge-base-from-other-owners.use-case';

describe(UnlinkKnowledgeBaseFromOtherOwnersUseCase.name, () => {
  const orgId = randomUUID();
  const teamId = randomUUID();
  const moved = new TeamKnowledgeBase({ name: 'Bauordnung', orgId, teamId });
  const params = { name: 'Skill', shortDescription: '', instructions: '' };
  const sameTeam = new TeamSkill({ ...params, teamId });
  const personal = new PersonalSkill({ ...params, userId: randomUUID() });
  const org = new OrgSkill({ ...params, orgId });

  function setup() {
    const repository = {
      findAllByKnowledgeBaseId: jest
        .fn()
        .mockResolvedValue([sameTeam, personal, org]),
      removeKnowledgeBaseFromSkills: jest.fn(),
    };
    const removeThreadAssignments = { execute: jest.fn() };
    const useCase = new UnlinkKnowledgeBaseFromOtherOwnersUseCase(
      repository as unknown as SkillRepository,
      removeThreadAssignments as unknown as RemoveKnowledgeBaseAssignmentsByOriginSkillUseCase,
    );
    return { repository, removeThreadAssignments, useCase };
  }

  it('removes the knowledge base from skills of other owners only', async () => {
    const { useCase, repository } = setup();

    await expect(
      useCase.execute(new UnlinkKnowledgeBaseFromOtherOwnersCommand(moved)),
    ).resolves.toEqual({ unlinkedSkillCount: 2 });
    expect(repository.removeKnowledgeBaseFromSkills).toHaveBeenCalledWith(
      moved.id,
      [personal.id, org.id],
    );
  });

  it('removes it from every thread that got it through an unlinked skill', async () => {
    const { useCase, removeThreadAssignments } = setup();

    await useCase.execute(new UnlinkKnowledgeBaseFromOtherOwnersCommand(moved));

    expect(removeThreadAssignments.execute).toHaveBeenCalledTimes(2);
    for (const skill of [personal, org]) {
      expect(removeThreadAssignments.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          skillId: skill.id,
          userIds: null,
          knowledgeBaseId: moved.id,
        }),
      );
    }
  });

  it('only counts on a dry run', async () => {
    const { useCase, repository } = setup();

    await expect(
      useCase.execute(
        new UnlinkKnowledgeBaseFromOtherOwnersCommand(moved, true),
      ),
    ).resolves.toEqual({ unlinkedSkillCount: 2 });
    expect(repository.removeKnowledgeBaseFromSkills).not.toHaveBeenCalled();
  });

  it('touches no threads on a dry run', async () => {
    const { useCase, removeThreadAssignments } = setup();

    await useCase.execute(
      new UnlinkKnowledgeBaseFromOtherOwnersCommand(moved, true),
    );

    expect(removeThreadAssignments.execute).not.toHaveBeenCalled();
  });
});
