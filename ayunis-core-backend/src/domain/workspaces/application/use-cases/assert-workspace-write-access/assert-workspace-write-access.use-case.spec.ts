import { randomUUID } from 'crypto';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { createMockWorkspaceAccessService } from 'src/domain/workspaces/application/testing/workspace.fixtures';
import {
  UnexpectedWorkspaceError,
  WorkspaceNotFoundError,
} from 'src/domain/workspaces/application/workspaces.errors';
import { Permission } from 'src/iam/permissions/domain/value-objects/permission.enum';
import { AssertWorkspaceWriteAccessUseCase } from './assert-workspace-write-access.use-case';

function setup() {
  const access = createMockWorkspaceAccessService();
  return {
    access,
    useCase: new AssertWorkspaceWriteAccessUseCase(access as never),
    query: { workspaceId: randomUUID() },
  };
}

describe(AssertWorkspaceWriteAccessUseCase.name, () => {
  it('requires manage_workspace in the workspace, not mere membership', async () => {
    const { access, useCase, query } = setup();
    await expect(useCase.execute(query)).resolves.toBeUndefined();
    expect(access.requirePermission).toHaveBeenCalledWith(
      query.workspaceId,
      Permission.MANAGE_WORKSPACE,
    );
  });
  it('preserves the denials', async () => {
    const { access, useCase, query } = setup();
    for (const error of [
      new WorkspaceNotFoundError(query.workspaceId),
      new UnauthorizedAccessError(),
    ]) {
      access.requirePermission.mockRejectedValue(error);
      await expect(useCase.execute(query)).rejects.toBe(error);
    }
  });
  it('wraps unexpected policy failures', async () => {
    const { access, useCase, query } = setup();
    access.requirePermission.mockRejectedValue(
      new Error('Database unavailable'),
    );
    await expect(useCase.execute(query)).rejects.toBeInstanceOf(
      UnexpectedWorkspaceError,
    );
  });
});
