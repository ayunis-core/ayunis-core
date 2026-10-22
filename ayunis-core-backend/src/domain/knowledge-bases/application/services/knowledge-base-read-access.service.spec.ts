import {
  OwnershipViewer,
  type OwnershipViewerParams,
} from 'src/domain/ownership/application/models/ownership-viewer';
import type { GetOwnershipViewerUseCase } from 'src/domain/ownership/application/use-cases/get-ownership-viewer/get-ownership-viewer.use-case';
import { TeamKnowledgeBase } from 'src/domain/knowledge-bases/domain/team-knowledge-base.entity';
import { OrgKnowledgeBase } from 'src/domain/knowledge-bases/domain/org-knowledge-base.entity';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { randomUUID } from 'crypto';
import type { IsHandoverReviewerUseCase } from 'src/domain/handovers/application/use-cases/is-handover-reviewer/is-handover-reviewer.use-case';
import { getFromUserContext } from 'src/common/context/testing/context.fixtures';
import type { ContextService } from 'src/common/context/services/context.service';
import { KnowledgeBaseNotFoundError } from 'src/domain/knowledge-bases/application/knowledge-bases.errors';
import { PersonalKnowledgeBase } from 'src/domain/knowledge-bases/domain/personal-knowledge-base.entity';
import { WorkspaceKnowledgeBase } from 'src/domain/knowledge-bases/domain/workspace-knowledge-base.entity';
import type { AssertWorkspaceExecutionAccessUseCase } from 'src/domain/workspaces/application/use-cases/assert-workspace-execution-access/assert-workspace-execution-access.use-case';
import type { AssertWorkspaceReadAccessUseCase } from 'src/domain/workspaces/application/use-cases/assert-workspace-read-access/assert-workspace-read-access.use-case';
import { WorkspaceNotFoundError } from 'src/domain/workspaces/application/workspaces.errors';
import type { WorkspaceKnowledgeBaseLinkRepository } from 'src/domain/knowledge-bases/application/ports/workspace-knowledge-base-link.repository';
import { KnowledgeBaseNotLinkableError } from 'src/domain/knowledge-bases/application/knowledge-bases.errors';
import { KnowledgeBaseReadAccessService } from './knowledge-base-read-access.service';

function setup() {
  const userId = randomUUID();
  const orgId = randomUUID();
  const workspaceId = randomUUID();
  const personal = new PersonalKnowledgeBase({
    name: 'Personal regulations',
    userId,
    orgId,
  });
  const workspace = new WorkspaceKnowledgeBase({
    name: 'Workspace regulations',
    workspaceId,
    orgId,
  });
  const workspaceRead = { execute: jest.fn().mockResolvedValue(undefined) };
  const workspaceExecution = {
    execute: jest.fn().mockResolvedValue(undefined),
  };
  const context = {
    get: jest.fn(getFromUserContext({ userId, orgId })),
  };
  const viewer = { execute: jest.fn() };
  const reviewer = { execute: jest.fn().mockResolvedValue(false) };
  const links = { findByKnowledgeBase: jest.fn().mockResolvedValue([]) };
  const viewerWith = (params: Partial<OwnershipViewerParams>) =>
    viewer.execute.mockResolvedValue(
      new OwnershipViewer({
        userId,
        orgId,
        isAdmin: false,
        permissions: [],
        memberTeamIds: [],
        adminTeamIds: [],
        teamAdminPermissions: [],
        ...params,
      }),
    );
  return {
    userId,
    orgId,
    personal,
    workspace,
    workspaceRead,
    workspaceExecution,
    context,
    service: new KnowledgeBaseReadAccessService(
      workspaceRead as unknown as AssertWorkspaceReadAccessUseCase,
      workspaceExecution as unknown as AssertWorkspaceExecutionAccessUseCase,
      context as unknown as ContextService,
      viewer as unknown as GetOwnershipViewerUseCase,
      reviewer as unknown as IsHandoverReviewerUseCase,
      links as unknown as WorkspaceKnowledgeBaseLinkRepository,
    ),
    viewerWith,
    reviewer,
    links,
  };
}

describe(KnowledgeBaseReadAccessService.name, () => {
  it('allows personal owners', async () => {
    const { service, personal } = setup();
    await expect(service.requireRead(personal)).resolves.toBeUndefined();
  });

  it('rejects inaccessible personal knowledge bases', async () => {
    const setupResult = setup();
    const inaccessible = new PersonalKnowledgeBase({
      name: 'Private regulations',
      userId: randomUUID(),
      orgId: setupResult.orgId,
    });
    await expect(
      setupResult.service.requireRead(inaccessible),
    ).rejects.toBeInstanceOf(KnowledgeBaseNotFoundError);
  });

  it('delegates workspace reads to the workspace capability', async () => {
    const { service, workspace, workspaceRead } = setup();
    await expect(service.requireRead(workspace)).resolves.toBeUndefined();
    expect(workspaceRead.execute).toHaveBeenCalledWith({
      workspaceId: workspace.workspaceId,
    });
  });

  it('delegates workspace execution to the authenticated thread capability', async () => {
    const { service, workspace, workspaceExecution } = setup();
    const threadId = randomUUID();
    await expect(
      service.requireExecution(workspace, threadId),
    ).resolves.toBeUndefined();
    expect(workspaceExecution.execute).toHaveBeenCalledWith({
      workspaceId: workspace.workspaceId,
      threadId,
    });
  });

  it('preserves personal sharing access during trusted execution', async () => {
    const { service, personal, workspaceExecution } = setup();
    await expect(
      service.requireExecution(personal, randomUUID()),
    ).resolves.toBeUndefined();
    expect(workspaceExecution.execute).not.toHaveBeenCalled();
  });

  it('hides workspace authorization details behind the resource not-found error', async () => {
    const { service, workspace, workspaceExecution } = setup();
    workspaceExecution.execute.mockRejectedValue(
      new WorkspaceNotFoundError(workspace.workspaceId),
    );
    await expect(
      service.requireExecution(workspace, randomUUID()),
    ).rejects.toBeInstanceOf(KnowledgeBaseNotFoundError);
  });

  it('rejects cross-organization resources before delegating access', async () => {
    const { service, workspace, workspaceRead } = setup();
    const foreign = new WorkspaceKnowledgeBase({
      ...workspace,
      orgId: randomUUID(),
    });
    await expect(service.requireRead(foreign)).rejects.toBeInstanceOf(
      KnowledgeBaseNotFoundError,
    );
    expect(workspaceRead.execute).not.toHaveBeenCalled();
  });

  it.each(['userId', 'orgId'] as const)(
    'requires authenticated %s context',
    async (missing) => {
      const { service, personal, context } = setup();
      context.get.mockImplementation((key: string) =>
        key === missing ? undefined : randomUUID(),
      );
      await expect(service.requireRead(personal)).rejects.toBeInstanceOf(
        UnauthorizedAccessError,
      );
    },
  );

  describe('team and organisation knowledge bases', () => {
    it('lets team members read and use a team knowledge base', async () => {
      const { service, orgId, viewerWith } = setup();
      const teamId = randomUUID();
      const team = new TeamKnowledgeBase({
        name: 'Merkblätter',
        orgId,
        teamId,
      });
      viewerWith({ memberTeamIds: [teamId] });

      await expect(service.requireRead(team)).resolves.toBeUndefined();
      await expect(
        service.requireExecution(team, randomUUID()),
      ).resolves.toBeUndefined();
    });

    it('hides a team knowledge base from people outside the team', async () => {
      const { service, orgId, viewerWith } = setup();
      const team = new TeamKnowledgeBase({
        name: 'Merkblätter',
        orgId,
        teamId: randomUUID(),
      });
      viewerWith({});

      await expect(service.requireRead(team)).rejects.toBeInstanceOf(
        KnowledgeBaseNotFoundError,
      );
    });

    it('lets admins read but not use a team knowledge base of another team', async () => {
      const { service, orgId, viewerWith } = setup();
      const team = new TeamKnowledgeBase({
        name: 'Merkblätter',
        orgId,
        teamId: randomUUID(),
      });
      viewerWith({ isAdmin: true });

      await expect(service.requireRead(team)).resolves.toBeUndefined();
      await expect(service.requireUse(team)).rejects.toBeInstanceOf(
        UnauthorizedAccessError,
      );
    });

    it('lets everyone in the organisation use an organisation knowledge base', async () => {
      const { service, orgId, viewerWith } = setup();
      const org = new OrgKnowledgeBase({ name: 'Dienstanweisungen', orgId });
      viewerWith({});

      await expect(service.requireUse(org)).resolves.toBeUndefined();
    });
  });

  it('lets a handover reviewer view a personal knowledge base read-only', async () => {
    const { service, orgId, reviewer } = setup();
    const foreign = new PersonalKnowledgeBase({
      name: 'Kassenprüfung',
      orgId,
      userId: randomUUID(),
    });
    reviewer.execute.mockResolvedValue(true);

    await expect(service.requireView(foreign)).resolves.toBeUndefined();
    await expect(
      service.requireExecution(foreign, randomUUID()),
    ).rejects.toBeInstanceOf(KnowledgeBaseNotFoundError);
  });

  describe('workspace links', () => {
    function linkedElsewhere() {
      const result = setup();
      const foreign = new PersonalKnowledgeBase({
        name: 'Satzungen',
        userId: randomUUID(),
        orgId: result.orgId,
      });
      const linkWorkspaceId = randomUUID();
      result.links.findByKnowledgeBase.mockResolvedValue([
        {
          workspaceId: linkWorkspaceId,
          knowledgeBaseId: foreign.id,
          linkedByUserId: null,
          linkedAt: new Date(),
        },
      ]);
      return { ...result, foreign, linkWorkspaceId };
    }

    it('lets a workspace reader view another person’s linked knowledge base', async () => {
      const { service, foreign, workspaceRead, linkWorkspaceId } =
        linkedElsewhere();

      await expect(service.requireView(foreign)).resolves.toBeUndefined();
      expect(workspaceRead.execute).toHaveBeenCalledWith({
        workspaceId: linkWorkspaceId,
      });
    });

    it('lets a linked knowledge base answer only in a thread of the linking workspace', async () => {
      const { service, foreign, workspaceExecution, linkWorkspaceId } =
        linkedElsewhere();
      const threadId = randomUUID();

      await expect(
        service.requireExecution(foreign, threadId),
      ).resolves.toBeUndefined();
      expect(workspaceExecution.execute).toHaveBeenCalledWith({
        workspaceId: linkWorkspaceId,
        threadId,
      });

      workspaceExecution.execute.mockRejectedValue(
        new WorkspaceNotFoundError(linkWorkspaceId),
      );
      await expect(
        service.requireExecution(foreign, threadId),
      ).rejects.toBeInstanceOf(KnowledgeBaseNotFoundError);
    });

    it('allows linking only own personal and usable collective knowledge bases', async () => {
      const { service, personal, workspace, orgId, viewerWith } = setup();
      const foreign = new PersonalKnowledgeBase({
        name: 'Fremd',
        userId: randomUUID(),
        orgId,
      });
      viewerWith({});

      await expect(service.requireLinkable(personal)).resolves.toBeUndefined();
      await expect(
        service.requireLinkable(new OrgKnowledgeBase({ name: 'Org', orgId })),
      ).resolves.toBeUndefined();
      await expect(service.requireLinkable(foreign)).rejects.toBeInstanceOf(
        KnowledgeBaseNotFoundError,
      );
      await expect(service.requireLinkable(workspace)).rejects.toBeInstanceOf(
        KnowledgeBaseNotLinkableError,
      );
    });
  });
});
