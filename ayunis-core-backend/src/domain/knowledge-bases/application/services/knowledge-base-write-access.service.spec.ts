import { randomUUID } from 'crypto';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { KnowledgeBaseNotFoundError } from 'src/domain/knowledge-bases/application/knowledge-bases.errors';
import { PersonalKnowledgeBase } from 'src/domain/knowledge-bases/domain/personal-knowledge-base.entity';
import { WorkspaceKnowledgeBase } from 'src/domain/knowledge-bases/domain/workspace-knowledge-base.entity';
import { TeamKnowledgeBase } from 'src/domain/knowledge-bases/domain/team-knowledge-base.entity';
import { OrgKnowledgeBase } from 'src/domain/knowledge-bases/domain/org-knowledge-base.entity';
import type { CollectiveKnowledgeBaseAccessService } from './collective-knowledge-base-access.service';
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
  const collectiveAccess = {
    requireWrite: jest.fn().mockResolvedValue(undefined),
    requireManage: jest.fn().mockResolvedValue(undefined),
  };
  return {
    context,
    workspaceAccess,
    personal,
    workspace,
    collectiveAccess,
    policy: new KnowledgeBaseWriteAccessService(
      context,
      workspaceAccess,
      collectiveAccess as unknown as CollectiveKnowledgeBaseAccessService,
    ),
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
  it('hides workspace access denial behind resource not found', async () => {
    const { policy, workspace, workspaceAccess } = setup();
    workspaceAccess.execute.mockRejectedValue(
      new WorkspaceNotFoundError(workspace.workspaceId),
    );
    await expect(policy.requireWrite(workspace)).rejects.toBeInstanceOf(
      KnowledgeBaseNotFoundError,
    );
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

  describe('team- and org-owned knowledge bases', () => {
    const team = new TeamKnowledgeBase({
      name: 'Bauordnung',
      orgId: TEST_ORG_ID,
      teamId: randomUUID(),
    });
    const org = new OrgKnowledgeBase({ name: 'Satzungen', orgId: TEST_ORG_ID });

    it.each([team, org])(
      'delegates writes to the collective policy',
      async (kb) => {
        const { policy, collectiveAccess, workspaceAccess } = setup();

        await policy.requireWrite(kb);

        expect(collectiveAccess.requireWrite).toHaveBeenCalledWith(kb);
        expect(workspaceAccess.execute).not.toHaveBeenCalled();
      },
    );

    it('propagates a denied collective write', async () => {
      const { policy, collectiveAccess } = setup();
      collectiveAccess.requireWrite.mockRejectedValue(
        new UnauthorizedAccessError(),
      );

      await expect(policy.requireWrite(team)).rejects.toBeInstanceOf(
        UnauthorizedAccessError,
      );
    });

    it('hides knowledge bases of another organization before asking the policy', async () => {
      const { policy, collectiveAccess } = setup();
      const foreign = new OrgKnowledgeBase({
        name: 'Satzungen',
        orgId: randomUUID(),
      });

      await expect(policy.requireWrite(foreign)).rejects.toBeInstanceOf(
        KnowledgeBaseNotFoundError,
      );
      expect(collectiveAccess.requireWrite).not.toHaveBeenCalled();
    });

    it('requires the right to manage the owner to create', async () => {
      const { policy, collectiveAccess } = setup();

      await policy.requireCreate(team);

      expect(collectiveAccess.requireManage).toHaveBeenCalledWith(team);
    });
  });
});
