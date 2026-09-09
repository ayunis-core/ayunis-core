import { randomUUID } from 'crypto';
import type { ContextService } from 'src/common/context/services/context.service';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { KnowledgeBaseNotFoundError } from 'src/domain/knowledge-bases/application/knowledge-bases.errors';
import { PersonalKnowledgeBase } from 'src/domain/knowledge-bases/domain/personal-knowledge-base.entity';
import { WorkspaceKnowledgeBase } from 'src/domain/knowledge-bases/domain/workspace-knowledge-base.entity';
import type { FindShareByEntityUseCase } from 'src/domain/shares/application/use-cases/find-share-by-entity/find-share-by-entity.use-case';
import type { CheckKnowledgeBaseSkillShareAccessUseCase } from 'src/domain/skills/application/use-cases/check-knowledge-base-skill-share-access/check-knowledge-base-skill-share-access.use-case';
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
  const findShare = { execute: jest.fn().mockResolvedValue(null) };
  const checkSkillShareAccess = {
    execute: jest.fn().mockResolvedValue(false),
  };
  const workspaceRead = { execute: jest.fn().mockResolvedValue(undefined) };
  const workspaceExecution = {
    execute: jest.fn().mockResolvedValue(undefined),
  };
  const context = {
    get: jest.fn((key: string) => ({ userId, orgId })[key]),
  };
  return {
    userId,
    orgId,
    personal,
    workspace,
    findShare,
    checkSkillShareAccess,
    workspaceRead,
    workspaceExecution,
    context,
    service: new KnowledgeBaseReadAccessService(
      findShare as unknown as FindShareByEntityUseCase,
      checkSkillShareAccess as unknown as CheckKnowledgeBaseSkillShareAccessUseCase,
      workspaceRead as unknown as AssertWorkspaceReadAccessUseCase,
      workspaceExecution as unknown as AssertWorkspaceExecutionAccessUseCase,
      context as unknown as ContextService,
    ),
  };
}

describe(KnowledgeBaseReadAccessService.name, () => {
  it('allows personal owners without checking shares', async () => {
    const { service, personal, findShare, checkSkillShareAccess } = setup();
    await expect(service.requireRead(personal)).resolves.toBeUndefined();
    expect(findShare.execute).not.toHaveBeenCalled();
    expect(checkSkillShareAccess.execute).not.toHaveBeenCalled();
  });

  it.each(['direct', 'skill'] as const)(
    'allows personal knowledge bases shared through a %s share',
    async (shareType) => {
      const setupResult = setup();
      const shared = new PersonalKnowledgeBase({
        name: 'Shared regulations',
        userId: randomUUID(),
        orgId: setupResult.orgId,
      });
      if (shareType === 'direct') {
        setupResult.findShare.execute.mockResolvedValue({ id: randomUUID() });
      } else {
        setupResult.checkSkillShareAccess.execute.mockResolvedValue(true);
      }
      await expect(
        setupResult.service.requireRead(shared),
      ).resolves.toBeUndefined();
    },
  );

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
});
