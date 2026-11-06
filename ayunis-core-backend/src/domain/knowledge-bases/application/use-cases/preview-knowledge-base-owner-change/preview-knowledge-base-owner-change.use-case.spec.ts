import { randomUUID } from 'crypto';
import type { KnowledgeBaseRepository } from 'src/domain/knowledge-bases/application/ports/knowledge-base.repository';
import type { KnowledgeBaseOwnerChangeService } from 'src/domain/knowledge-bases/application/services/knowledge-base-owner-change.service';
import type { KnowledgeBaseWriteAccessService } from 'src/domain/knowledge-bases/application/services/knowledge-base-write-access.service';
import { OrgKnowledgeBase } from 'src/domain/knowledge-bases/domain/org-knowledge-base.entity';
import { PersonalKnowledgeBase } from 'src/domain/knowledge-bases/domain/personal-knowledge-base.entity';
import type { UnlinkKnowledgeBaseFromOtherOwnersUseCase } from 'src/domain/skills/application/use-cases/unlink-knowledge-base-from-other-owners/unlink-knowledge-base-from-other-owners.use-case';
import { PreviewKnowledgeBaseOwnerChangeUseCase } from './preview-knowledge-base-owner-change.use-case';

describe(PreviewKnowledgeBaseOwnerChangeUseCase.name, () => {
  const orgId = randomUUID();
  const personal = new PersonalKnowledgeBase({
    name: 'Bauordnung',
    orgId,
    userId: randomUUID(),
  });
  const org = new OrgKnowledgeBase({
    id: personal.id,
    name: 'Bauordnung',
    orgId,
  });

  it('counts the skill links the move would drop without removing them', async () => {
    const unlinkSkills = {
      execute: jest.fn().mockResolvedValue({ unlinkedSkillCount: 3 }),
    };
    const writeAccess = { requireWrite: jest.fn() };
    const useCase = new PreviewKnowledgeBaseOwnerChangeUseCase(
      {
        findById: jest.fn().mockResolvedValue(personal),
      } as unknown as KnowledgeBaseRepository,
      writeAccess as unknown as KnowledgeBaseWriteAccessService,
      {
        plan: jest.fn().mockResolvedValue({ changed: true, target: org }),
      } as unknown as KnowledgeBaseOwnerChangeService,
      unlinkSkills as unknown as UnlinkKnowledgeBaseFromOtherOwnersUseCase,
    );

    await expect(
      useCase.execute({ knowledgeBaseId: personal.id, owner: { type: 'org' } }),
    ).resolves.toEqual({ unlinkedSkillCount: 3 });
    expect(writeAccess.requireWrite).toHaveBeenCalledWith(personal);
    expect(unlinkSkills.execute).toHaveBeenCalledWith(
      expect.objectContaining({ knowledgeBase: org, dryRun: true }),
    );
  });
});
