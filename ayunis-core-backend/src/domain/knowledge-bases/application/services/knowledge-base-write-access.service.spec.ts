import { randomUUID } from 'crypto';
import {
  OwnershipViewer,
  type OwnershipViewerParams,
} from 'src/domain/ownership/application/models/ownership-viewer';
import type { GetOwnershipViewerUseCase } from 'src/domain/ownership/application/use-cases/get-ownership-viewer/get-ownership-viewer.use-case';
import type { HasPermissionUseCase } from 'src/iam/permissions/application/use-cases/has-permission/has-permission.use-case';
import { Permission } from 'src/iam/permissions/domain/value-objects/permission.enum';
import { TeamAdminPermission } from 'src/iam/permissions/domain/value-objects/team-admin-permission.enum';
import { TeamKnowledgeBase } from 'src/domain/knowledge-bases/domain/team-knowledge-base.entity';
import { OrgKnowledgeBase } from 'src/domain/knowledge-bases/domain/org-knowledge-base.entity';
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
  const viewer = { execute: jest.fn() };
  const permission = { execute: jest.fn().mockResolvedValue(true) };
  return {
    context,
    workspaceAccess,
    personal,
    workspace,
    viewer,
    permission,
    policy: new KnowledgeBaseWriteAccessService(
      context,
      workspaceAccess,
      viewer as unknown as GetOwnershipViewerUseCase,
      permission as unknown as HasPermissionUseCase,
    ),
  };
}

function viewerOf(params: Partial<OwnershipViewerParams>): OwnershipViewer {
  return new OwnershipViewer({
    userId: TEST_USER_ID,
    orgId: TEST_ORG_ID,
    isAdmin: false,
    permissions: [],
    memberTeamIds: [],
    adminTeamIds: [],
    teamAdminPermissions: [],
    ...params,
  });
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

  it('lets team admins with the team right change a team knowledge base', async () => {
    const { policy, viewer } = setup();
    const teamId = randomUUID();
    viewer.execute.mockResolvedValue(
      viewerOf({
        memberTeamIds: [teamId],
        adminTeamIds: [teamId],
        teamAdminPermissions: [TeamAdminPermission.TEAM_MANAGE_KNOWLEDGE],
      }),
    );
    const team = new TeamKnowledgeBase({
      name: 'Merkblätter',
      orgId: TEST_ORG_ID,
      teamId,
    });

    await expect(policy.requireManage(team)).resolves.toBeUndefined();
  });

  it('keeps members read-only on a team knowledge base', async () => {
    const { policy, viewer } = setup();
    const teamId = randomUUID();
    viewer.execute.mockResolvedValue(viewerOf({ memberTeamIds: [teamId] }));
    const team = new TeamKnowledgeBase({
      name: 'Merkblätter',
      orgId: TEST_ORG_ID,
      teamId,
    });

    await expect(policy.requireWrite(team)).rejects.toBeInstanceOf(
      UnauthorizedAccessError,
    );
  });

  it('lets holders of the organisation right change organisation knowledge', async () => {
    const { policy, viewer } = setup();
    viewer.execute.mockResolvedValue(
      viewerOf({ permissions: [Permission.MANAGE_ORG_KNOWLEDGE] }),
    );
    const org = new OrgKnowledgeBase({
      name: 'Dienstanweisungen',
      orgId: TEST_ORG_ID,
    });

    await expect(policy.requireWrite(org)).resolves.toBeUndefined();
  });

  it('requires the own-knowledge right to change a personal knowledge base', async () => {
    const { policy, personal, permission } = setup();
    permission.execute.mockResolvedValue(false);

    await expect(policy.requireManage(personal)).rejects.toBeInstanceOf(
      UnauthorizedAccessError,
    );
  });
});
