import { randomUUID } from 'crypto';
import type { SkillRepository } from 'src/domain/skills/application/ports/skill.repository';
import type { SkillAuthorizationService } from 'src/domain/skills/application/services/skill-authorization.service';
import type { SkillOwnerChangeService } from 'src/domain/skills/application/services/skill-owner-change.service';
import { SkillNotFoundError } from 'src/domain/skills/application/skills.errors';
import { PersonalSkill } from 'src/domain/skills/domain/personal-skill.entity';
import { PreviewSkillOwnerChangeQuery } from './preview-skill-owner-change.query';
import { PreviewSkillOwnerChangeUseCase } from './preview-skill-owner-change.use-case';

describe(PreviewSkillOwnerChangeUseCase.name, () => {
  const skill = new PersonalSkill({
    name: 'Council minutes',
    shortDescription: '',
    instructions: '',
    userId: randomUUID(),
  });

  function setup() {
    const authorization = { requireWrite: jest.fn() };
    const planner = {
      plan: jest.fn().mockResolvedValue({
        changed: true,
        target: skill,
        unlinkedKnowledgeBaseIds: [randomUUID(), randomUUID()],
      }),
    };
    const useCase = new PreviewSkillOwnerChangeUseCase(
      {
        findById: jest.fn().mockResolvedValue(skill),
      } as unknown as SkillRepository,
      authorization as unknown as SkillAuthorizationService,
      planner as unknown as SkillOwnerChangeService,
    );
    return { authorization, useCase };
  }

  it('counts the knowledge-base links the move would drop', async () => {
    const { useCase, authorization } = setup();

    await expect(
      useCase.execute(
        new PreviewSkillOwnerChangeQuery(skill.id, { type: 'org' }),
      ),
    ).resolves.toEqual({ unlinkedKnowledgeBaseCount: 2 });
    expect(authorization.requireWrite).toHaveBeenCalledWith(skill);
  });

  it('reveals nothing to users who cannot manage the skill', async () => {
    const { useCase, authorization } = setup();
    authorization.requireWrite.mockRejectedValue(
      new SkillNotFoundError(skill.id),
    );

    await expect(
      useCase.execute(
        new PreviewSkillOwnerChangeQuery(skill.id, { type: 'org' }),
      ),
    ).rejects.toBeInstanceOf(SkillNotFoundError);
  });
});
