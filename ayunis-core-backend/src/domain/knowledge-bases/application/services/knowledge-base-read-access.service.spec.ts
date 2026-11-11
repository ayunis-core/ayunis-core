import { randomUUID } from 'crypto';
import { getFromUserContext } from 'src/common/context/testing/context.fixtures';
import type { ContextService } from 'src/common/context/services/context.service';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { KnowledgeBaseNotFoundError } from 'src/domain/knowledge-bases/application/knowledge-bases.errors';
import { PersonalKnowledgeBase } from 'src/domain/knowledge-bases/domain/personal-knowledge-base.entity';
import { WorkspaceKnowledgeBase } from 'src/domain/knowledge-bases/domain/workspace-knowledge-base.entity';
import { TeamKnowledgeBase } from 'src/domain/knowledge-bases/domain/team-knowledge-base.entity';
import type { CollectiveKnowledgeBaseAccessService } from './collective-knowledge-base-access.service';
import type { AssertWorkspaceExecutionAccessUseCase } from 'src/domain/workspaces/application/use-cases/assert-workspace-execution-access/assert-workspace-execution-access.use-case';
import type { AssertWorkspaceReadAccessUseCase } from 'src/domain/workspaces/application/use-cases/assert-workspace-read-access/assert-workspace-read-access.use-case';
import { WorkspaceNotFoundError } from 'src/domain/workspaces/application/workspaces.errors';
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
  const collectiveAccess = {
    requireRead: jest.fn().mockResolvedValue(undefined),
  };
  return {
    collectiveAccess,
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
      collectiveAccess as unknown as CollectiveKnowledgeBaseAccessService,
    ),
  };
}

describe(KnowledgeBaseReadAccessService.name, () => {
  it('allows the owner of a personal knowledge base', async () => {
    const { service, personal } = setup();
    await expect(service.requireRead(personal)).resolves.toBeUndefined();
  });

  it("hides another member's personal knowledge base from reads and tool execution", async () => {
    const setupResult = setup();
    const colleagues = new PersonalKnowledgeBase({
      name: 'Private regulations',
      userId: randomUUID(),
      orgId: setupResult.orgId,
    });
    await expect(
      setupResult.service.requireRead(colleagues),
    ).rejects.toBeInstanceOf(KnowledgeBaseNotFoundError);
    await expect(
      setupResult.service.requireExecution(colleagues, randomUUID()),
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

  it('lets the owner execute a personal knowledge base', async () => {
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

  describe('team-owned knowledge bases', () => {
    it('delegates reads and tool execution to the collective policy', async () => {
      const { service, collectiveAccess, orgId, workspaceExecution } = setup();
      const team = new TeamKnowledgeBase({
        name: 'Bauordnung',
        orgId,
        teamId: randomUUID(),
      });

      await service.requireRead(team);
      await service.requireExecution(team, randomUUID());

      expect(collectiveAccess.requireRead).toHaveBeenCalledTimes(2);
      expect(workspaceExecution.execute).not.toHaveBeenCalled();
    });

    it('propagates a denied collective read', async () => {
      const { service, collectiveAccess, orgId } = setup();
      const team = new TeamKnowledgeBase({
        name: 'Bauordnung',
        orgId,
        teamId: randomUUID(),
      });
      collectiveAccess.requireRead.mockRejectedValue(
        new KnowledgeBaseNotFoundError(team.id),
      );

      await expect(service.requireRead(team)).rejects.toBeInstanceOf(
        KnowledgeBaseNotFoundError,
      );
    });
  });
});
