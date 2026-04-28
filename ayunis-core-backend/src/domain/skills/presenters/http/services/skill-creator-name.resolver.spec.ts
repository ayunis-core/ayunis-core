import { SkillCreatorNameResolver } from './skill-creator-name.resolver';
import type { FindUsersByIdsUseCase } from 'src/iam/users/application/use-cases/find-users-by-ids/find-users-by-ids.use-case';
import type { User } from 'src/iam/users/domain/user.entity';
import type { UUID } from 'crypto';

describe('SkillCreatorNameResolver', () => {
  let resolver: SkillCreatorNameResolver;
  let findUsersByIdsUseCase: jest.Mocked<FindUsersByIdsUseCase>;

  beforeEach(() => {
    findUsersByIdsUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<FindUsersByIdsUseCase>;
    resolver = new SkillCreatorNameResolver(findUsersByIdsUseCase);
  });

  it('should resolve one creator through the org-scoped batch lookup', async () => {
    const userId = '123e4567-e89b-12d3-a456-426614174000' as UUID;
    findUsersByIdsUseCase.execute.mockResolvedValue([
      { id: userId, name: 'Alice Example' } as User,
    ]);

    const result = await resolver.resolveOne(userId);

    expect(result).toBe('Alice Example');
    expect(findUsersByIdsUseCase.execute).toHaveBeenCalledWith({
      ids: [userId],
    });
  });

  it('should return null when the org-scoped batch lookup omits the creator', async () => {
    const userId = '123e4567-e89b-12d3-a456-426614174000' as UUID;
    findUsersByIdsUseCase.execute.mockResolvedValue([]);

    await expect(resolver.resolveOne(userId)).resolves.toBeNull();
  });
});
