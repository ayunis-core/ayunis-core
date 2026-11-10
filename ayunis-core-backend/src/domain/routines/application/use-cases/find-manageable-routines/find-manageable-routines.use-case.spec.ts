import { randomUUID, type UUID } from 'crypto';
import { createMockContextService } from 'src/common/context/testing/context.fixtures';
import type { HasPermissionUseCase } from 'src/iam/permissions/application/use-cases/has-permission/has-permission.use-case';
import {
  aRoutine,
  createMockRoutinesRepository,
  TEST_ORG_ID,
} from 'src/domain/routines/application/testing/routine.fixtures';
import { FindManageableRoutinesUseCase } from './find-manageable-routines.use-case';

describe('FindManageableRoutinesUseCase', () => {
  const ownRoutine = aRoutine();
  const otherUsersRoutine = aRoutine({
    id: randomUUID(),
    userId: randomUUID(),
  });

  function useCase({
    routinesEnabled = true,
    permitted = true,
    contextService = createMockContextService(),
  } = {}) {
    const repository = createMockRoutinesRepository();
    repository.findAllByUserId.mockImplementation((userId: UUID) =>
      Promise.resolve(
        [ownRoutine, otherUsersRoutine].filter((r) => r.userId === userId),
      ),
    );
    const hasPermission = {
      execute: jest.fn().mockResolvedValue(permitted),
    } as unknown as HasPermissionUseCase;
    return new FindManageableRoutinesUseCase(
      repository,
      contextService,
      hasPermission,
      { get: () => routinesEnabled } as never,
    );
  }

  it("returns the current user's own routines when they may manage routines", async () => {
    await expect(useCase().execute()).resolves.toEqual([ownRoutine]);
  });

  it('returns null with the routines feature turned off', async () => {
    await expect(
      useCase({ routinesEnabled: false }).execute(),
    ).resolves.toBeNull();
  });

  it('returns null for a user without the manage_routines permission', async () => {
    await expect(useCase({ permitted: false }).execute()).resolves.toBeNull();
  });

  it('returns null without a user, as for an API key', async () => {
    const contextService = createMockContextService({
      orgId: TEST_ORG_ID,
      apiKeyId: randomUUID(),
    });

    await expect(useCase({ contextService }).execute()).resolves.toBeNull();
  });
});
