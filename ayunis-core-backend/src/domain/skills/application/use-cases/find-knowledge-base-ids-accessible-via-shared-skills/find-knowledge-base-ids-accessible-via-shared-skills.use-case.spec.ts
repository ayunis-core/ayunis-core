import type { UUID } from 'crypto';
import type { FindSharesByScopeUseCase } from 'src/domain/shares/application/use-cases/find-shares-by-scope/find-shares-by-scope.use-case';
import type { SkillRepository } from 'src/domain/skills/application/ports/skill.repository';
import { FindKnowledgeBaseIdsAccessibleViaSharedSkillsUseCase } from './find-knowledge-base-ids-accessible-via-shared-skills.use-case';

describe('FindKnowledgeBaseIdsAccessibleViaSharedSkillsUseCase', () => {
  const sharedSkillId = '660e8400-e29b-41d4-a716-446655440001' as UUID;
  const knowledgeBaseId = '550e8400-e29b-41d4-a716-446655440000' as UUID;
  const repository = {
    findKnowledgeBaseIdsBySkillIds: jest.fn(),
  } as unknown as jest.Mocked<SkillRepository>;
  const findSharesByScopeUseCase = {
    execute: jest.fn(),
  } as unknown as jest.Mocked<FindSharesByScopeUseCase>;

  it('returns knowledge bases linked to skills shared with the current user', async () => {
    findSharesByScopeUseCase.execute.mockResolvedValue([
      { entityId: sharedSkillId } as never,
      { entityId: sharedSkillId } as never,
    ]);
    repository.findKnowledgeBaseIdsBySkillIds.mockResolvedValue([
      knowledgeBaseId,
    ]);
    const useCase = new FindKnowledgeBaseIdsAccessibleViaSharedSkillsUseCase(
      repository,
      findSharesByScopeUseCase,
    );

    await expect(useCase.execute()).resolves.toEqual([knowledgeBaseId]);
    expect(repository.findKnowledgeBaseIdsBySkillIds).toHaveBeenCalledWith([
      sharedSkillId,
    ]);
  });
});
