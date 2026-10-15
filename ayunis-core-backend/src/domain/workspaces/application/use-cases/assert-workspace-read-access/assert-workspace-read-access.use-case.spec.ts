import { randomUUID } from 'crypto';
import type { WorkspaceAccessService } from 'src/domain/workspaces/application/services/workspace-access.service';
import {
  UnexpectedWorkspaceError,
  WorkspaceNotFoundError,
} from 'src/domain/workspaces/application/workspaces.errors';
import { AssertWorkspaceReadAccessUseCase } from './assert-workspace-read-access.use-case';

function setup() {
  const access = {
    require: jest.fn().mockResolvedValue(undefined),
  } as unknown as jest.Mocked<WorkspaceAccessService>;
  return {
    access,
    useCase: new AssertWorkspaceReadAccessUseCase(access),
    query: { workspaceId: randomUUID() },
  };
}

describe(AssertWorkspaceReadAccessUseCase.name, () => {
  it('allows the authenticated workspace owner', async () => {
    const { access, useCase, query } = setup();
    await expect(useCase.execute(query)).resolves.toBeUndefined();
    expect(access.require).toHaveBeenCalledWith(query.workspaceId, 'use');
  });

  it('preserves an ownership denial', async () => {
    const { access, useCase, query } = setup();
    const error = new WorkspaceNotFoundError(query.workspaceId);
    access.require.mockRejectedValue(error);
    await expect(useCase.execute(query)).rejects.toBe(error);
  });

  it('wraps unexpected policy failures', async () => {
    const { access, useCase, query } = setup();
    access.require.mockRejectedValue(new Error('Database unavailable'));
    await expect(useCase.execute(query)).rejects.toBeInstanceOf(
      UnexpectedWorkspaceError,
    );
  });
});
