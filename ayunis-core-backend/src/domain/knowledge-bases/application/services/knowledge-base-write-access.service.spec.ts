import { randomUUID } from 'crypto';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { KnowledgeBaseNotFoundError } from 'src/domain/knowledge-bases/application/knowledge-bases.errors';
import { PersonalKnowledgeBase } from 'src/domain/knowledge-bases/domain/personal-knowledge-base.entity';
import { WorkspaceKnowledgeBase } from 'src/domain/knowledge-bases/domain/workspace-knowledge-base.entity';
import { WorkspaceNotFoundError } from 'src/domain/workspaces/application/workspaces.errors';
import type { AssertWorkspaceWriteAccessUseCase } from 'src/domain/workspaces/application/use-cases/assert-workspace-write-access/assert-workspace-write-access.use-case';
import {
  createMockContextService,
  TEST_ORG_ID,
  TEST_USER_ID,
} from 'src/domain/workspaces/application/testing/workspace.fixtures';
import { KnowledgeBaseWriteAccessService } from './knowledge-base-write-access.service';

function setup() {
  const context = createMockContextService();
  const workspaceAccess = {
    execute: jest.fn().mockResolvedValue(undefined),
  } as unknown as jest.Mocked<AssertWorkspaceWriteAccessUseCase>;
  const personal = new PersonalKnowledgeBase({
    name: 'Private rules',
    orgId: TEST_ORG_ID,
    userId: TEST_USER_ID,
  });
  const workspace = new WorkspaceKnowledgeBase({
    name: 'Workspace rules',
    orgId: TEST_ORG_ID,
    workspaceId: randomUUID(),
  });
  return {
    context,
    workspaceAccess,
    personal,
    workspace,
    policy: new KnowledgeBaseWriteAccessService(context, workspaceAccess),
  };
}

describe(KnowledgeBaseWriteAccessService.name, () => {
  it('allows personal ownership without querying workspace access', async () => {
    const { policy, personal, workspaceAccess } = setup();
    await expect(policy.requireWrite(personal)).resolves.toBeUndefined();
    expect(workspaceAccess.execute).not.toHaveBeenCalled();
  });
  it('does not treat another owner or shared read access as write access', async () => {
    const { policy, workspaceAccess } = setup();
    const personal = new PersonalKnowledgeBase({
      name: 'Shared rules',
      orgId: TEST_ORG_ID,
      userId: randomUUID(),
    });
    await expect(policy.requireWrite(personal)).rejects.toBeInstanceOf(
      KnowledgeBaseNotFoundError,
    );
    expect(workspaceAccess.execute).not.toHaveBeenCalled();
  });
  it('denies objects that are not a supported ownership class', async () => {
    const { policy, personal, workspaceAccess } = setup();
    await expect(policy.requireWrite({ ...personal })).rejects.toBeInstanceOf(
      KnowledgeBaseNotFoundError,
    );
    expect(workspaceAccess.execute).not.toHaveBeenCalled();
  });
  it('delegates workspace permission to its exported use case', async () => {
    const { policy, workspace, workspaceAccess } = setup();
    await expect(policy.requireWrite(workspace)).resolves.toBeUndefined();
    expect(workspaceAccess.execute).toHaveBeenCalledWith({
      workspaceId: workspace.workspaceId,
    });
  });
  it('preserves workspace access denial', async () => {
    const { policy, workspace, workspaceAccess } = setup();
    const error = new WorkspaceNotFoundError(workspace.workspaceId);
    workspaceAccess.execute.mockRejectedValue(error);
    await expect(policy.requireWrite(workspace)).rejects.toBe(error);
  });
  it('rejects cross-organization ownership before delegation', async () => {
    const { policy, workspace, workspaceAccess } = setup();
    const foreign = new WorkspaceKnowledgeBase({
      ...workspace,
      orgId: randomUUID(),
    });
    await expect(policy.requireWrite(foreign)).rejects.toBeInstanceOf(
      KnowledgeBaseNotFoundError,
    );
    expect(workspaceAccess.execute).not.toHaveBeenCalled();
  });
  it.each(['userId', 'orgId'] as const)(
    'requires authenticated %s',
    async (missing) => {
      const { policy, context, personal } = setup();
      context.get.mockImplementation((key) => {
        if (key === missing) return undefined;
        if (key === 'userId') return TEST_USER_ID;
        if (key === 'orgId') return TEST_ORG_ID;
        return undefined;
      });
      await expect(policy.requireWrite(personal)).rejects.toBeInstanceOf(
        UnauthorizedAccessError,
      );
    },
  );
});
