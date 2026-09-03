import type { UUID } from 'crypto';
import { Paginated } from 'src/common/pagination/paginated.entity';
import type { ContextService } from 'src/common/context/services/context.service';
import type { FindSharesByScopeUseCase } from 'src/domain/shares/application/use-cases/find-shares-by-scope/find-shares-by-scope.use-case';
import type { SkillRepository } from 'src/domain/skills/application/ports/skill.repository';
import type { Skill } from 'src/domain/skills/domain/skill.entity';
import { ListAccessibleSkillsUseCase } from './list-accessible-skills.use-case';
import { ListAccessibleSkillsQuery } from './list-accessible-skills.query';

describe('ListAccessibleSkillsUseCase', () => {
  const userId = '123e4567-e89b-12d3-a456-426614174000' as UUID;
  const workspaceId = '223e4567-e89b-12d3-a456-426614174001' as UUID;
  const sharedSkillId = '323e4567-e89b-12d3-a456-426614174002' as UUID;
  const repository = {
    findPaginatedAccessible: jest.fn(),
  } as unknown as jest.Mocked<SkillRepository>;
  const findSharesByScopeUseCase = {
    execute: jest.fn(),
  } as unknown as jest.Mocked<FindSharesByScopeUseCase>;
  const contextService = {
    get: jest.fn().mockReturnValue(userId),
  } as unknown as jest.Mocked<ContextService>;

  it('returns the requested accessible skill page', async () => {
    const page = new Paginated<Skill>({
      data: [],
      limit: 2,
      offset: 4,
      total: 8,
    });
    repository.findPaginatedAccessible.mockResolvedValue(page);
    findSharesByScopeUseCase.execute.mockResolvedValue([
      { entityId: sharedSkillId } as never,
    ]);
    const useCase = new ListAccessibleSkillsUseCase(
      repository,
      findSharesByScopeUseCase,
      contextService,
    );

    const result = await useCase.execute(
      new ListAccessibleSkillsQuery({
        search: 'citizen',
        workspaceId,
        limit: 2,
        offset: 4,
      }),
    );

    expect(result).toBe(page);
    expect(repository.findPaginatedAccessible).toHaveBeenCalledWith(
      userId,
      workspaceId,
      [sharedSkillId],
      {
        search: 'citizen',
        limit: 2,
        offset: 4,
      },
    );
  });
});
