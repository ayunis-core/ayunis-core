import { randomUUID } from 'crypto';
import type { ContextService } from 'src/common/context/services/context.service';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import type { FindShareByEntityUseCase } from 'src/domain/shares/application/use-cases/find-share-by-entity/find-share-by-entity.use-case';
import { SkillNotFoundError } from 'src/domain/skills/application/skills.errors';
import { PersonalSkill } from 'src/domain/skills/domain/personal-skill.entity';
import { WorkspaceSkill } from 'src/domain/skills/domain/workspace-skill.entity';
import type { AssertWorkspaceExecutionAccessUseCase } from 'src/domain/workspaces/application/use-cases/assert-workspace-execution-access/assert-workspace-execution-access.use-case';
import type { AssertWorkspaceReadAccessUseCase } from 'src/domain/workspaces/application/use-cases/assert-workspace-read-access/assert-workspace-read-access.use-case';
import type { AssertWorkspaceWriteAccessUseCase } from 'src/domain/workspaces/application/use-cases/assert-workspace-write-access/assert-workspace-write-access.use-case';
import { WorkspaceNotFoundError } from 'src/domain/workspaces/application/workspaces.errors';
import { SkillAuthorizationService } from './skill-authorization.service';

function setup() {
  const userId = randomUUID();
  const orgId = randomUUID();
  const workspaceId = randomUUID();
  const personal = new PersonalSkill({
    name: 'Legal research',
    shortDescription: 'Research legal questions',
    instructions: 'Use authoritative sources.',
    userId,
  });
  const workspace = new WorkspaceSkill({
    name: 'Permit review',
    shortDescription: 'Review permit requests',
    instructions: 'Use workspace regulations.',
    workspaceId,
  });
  const shares = { execute: jest.fn().mockResolvedValue(null) };
  const workspaceRead = { execute: jest.fn().mockResolvedValue(undefined) };
  const workspaceWrite = { execute: jest.fn().mockResolvedValue(undefined) };
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
    shares,
    workspaceRead,
    workspaceWrite,
    workspaceExecution,
    context,
    service: new SkillAuthorizationService(
      shares as unknown as FindShareByEntityUseCase,
      workspaceRead as unknown as AssertWorkspaceReadAccessUseCase,
      workspaceWrite as unknown as AssertWorkspaceWriteAccessUseCase,
      workspaceExecution as unknown as AssertWorkspaceExecutionAccessUseCase,
      context as unknown as ContextService,
    ),
  };
}

describe(SkillAuthorizationService.name, () => {
  it('allows a personal skill owner to read', async () => {
    const { service, personal, shares } = setup();
    await expect(service.requireRead(personal)).resolves.toBeUndefined();
    expect(shares.execute).not.toHaveBeenCalled();
  });

  it('allows a personal skill share recipient to read', async () => {
    const { service, personal, shares } = setup();
    const shared = new PersonalSkill({ ...personal, userId: randomUUID() });
    shares.execute.mockResolvedValue({});
    await expect(service.requireRead(shared)).resolves.toBeUndefined();
  });

  it('does not grant write access through a personal share', async () => {
    const { service, personal } = setup();
    const shared = new PersonalSkill({ ...personal, userId: randomUUID() });
    await expect(service.requireWrite(shared)).rejects.toBeInstanceOf(
      SkillNotFoundError,
    );
  });

  it('delegates workspace reads to the workspace capability', async () => {
    const { service, workspace, workspaceRead } = setup();
    await expect(service.requireRead(workspace)).resolves.toBeUndefined();
    expect(workspaceRead.execute).toHaveBeenCalledWith({
      workspaceId: workspace.workspaceId,
    });
  });

  it('delegates workspace writes to the workspace capability', async () => {
    const { service, workspace, workspaceWrite } = setup();
    await expect(service.requireWrite(workspace)).resolves.toBeUndefined();
    expect(workspaceWrite.execute).toHaveBeenCalledWith({
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

  it('hides workspace authorization details behind skill not found', async () => {
    const { service, workspace, workspaceExecution } = setup();
    workspaceExecution.execute.mockRejectedValue(
      new WorkspaceNotFoundError(workspace.workspaceId),
    );
    await expect(
      service.requireExecution(workspace, randomUUID()),
    ).rejects.toBeInstanceOf(SkillNotFoundError);
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
