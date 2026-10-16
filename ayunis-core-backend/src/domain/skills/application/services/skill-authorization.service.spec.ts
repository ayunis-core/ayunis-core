import { randomUUID, type UUID } from 'crypto';
import type { IsHandoverReviewerUseCase } from 'src/domain/handovers/application/use-cases/is-handover-reviewer/is-handover-reviewer.use-case';
import {
  OwnershipViewer,
  type OwnershipViewerParams,
} from 'src/domain/ownership/application/models/ownership-viewer';
import type { GetOwnershipViewerUseCase } from 'src/domain/ownership/application/use-cases/get-ownership-viewer/get-ownership-viewer.use-case';
import type { HasPermissionUseCase } from 'src/iam/permissions/application/use-cases/has-permission/has-permission.use-case';
import { Permission } from 'src/iam/permissions/domain/value-objects/permission.enum';
import { TeamAdminPermission } from 'src/iam/permissions/domain/value-objects/team-admin-permission.enum';
import { OrgSkill } from 'src/domain/skills/domain/org-skill.entity';
import { TeamSkill } from 'src/domain/skills/domain/team-skill.entity';
import { getFromUserContext } from 'src/common/context/testing/context.fixtures';
import type { ContextService } from 'src/common/context/services/context.service';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
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
  const workspaceRead = { execute: jest.fn().mockResolvedValue(undefined) };
  const workspaceWrite = { execute: jest.fn().mockResolvedValue(undefined) };
  const workspaceExecution = {
    execute: jest.fn().mockResolvedValue(undefined),
  };
  const context = {
    get: jest.fn(getFromUserContext({ userId, orgId })),
  };
  const viewer = { execute: jest.fn() };
  const hasPermission = { execute: jest.fn().mockResolvedValue(true) };
  const reviewer = { execute: jest.fn().mockResolvedValue(false) };
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
    viewerWith,
    hasPermission,
    userId,
    orgId,
    personal,
    workspace,
    workspaceRead,
    workspaceWrite,
    workspaceExecution,
    context,
    service: new SkillAuthorizationService(
      workspaceRead as unknown as AssertWorkspaceReadAccessUseCase,
      workspaceWrite as unknown as AssertWorkspaceWriteAccessUseCase,
      workspaceExecution as unknown as AssertWorkspaceExecutionAccessUseCase,
      context as unknown as ContextService,
      viewer as unknown as GetOwnershipViewerUseCase,
      hasPermission as unknown as HasPermissionUseCase,
      reviewer as unknown as IsHandoverReviewerUseCase,
    ),
    reviewer,
  };
}

function collectiveSkills(orgId: UUID, teamId: UUID) {
  const params = {
    name: 'Bauantrag vorprüfen',
    shortDescription: 'Prüft Bauanträge',
    instructions: 'Prüfe die Unterlagen.',
  };
  return {
    team: new TeamSkill({ ...params, teamId, orgId }),
    org: new OrgSkill({ ...params, orgId }),
  };
}

describe(SkillAuthorizationService.name, () => {
  it('allows a personal skill owner to read', async () => {
    const { service, personal } = setup();
    await expect(service.requireRead(personal)).resolves.toBeUndefined();
  });

  it('hides a personal skill from everyone but its owner', async () => {
    const { service, personal } = setup();
    const foreign = new PersonalSkill({ ...personal, userId: randomUUID() });
    await expect(service.requireRead(foreign)).rejects.toBeInstanceOf(
      SkillNotFoundError,
    );
  });

  it('does not grant write access to another person', async () => {
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

  describe('team and organisation skills', () => {
    it('lets team members read and use a team skill but not change it', async () => {
      const { service, orgId, viewerWith } = setup();
      const teamId = randomUUID();
      const { team } = collectiveSkills(orgId, teamId);
      viewerWith({ memberTeamIds: [teamId] });

      await expect(service.requireRead(team)).resolves.toBeUndefined();
      await expect(service.requireUse(team)).resolves.toBeUndefined();
      await expect(service.requireWrite(team)).rejects.toBeInstanceOf(
        UnauthorizedAccessError,
      );
    });

    it('hides a team skill from people outside the team', async () => {
      const { service, orgId, viewerWith } = setup();
      const { team } = collectiveSkills(orgId, randomUUID());
      viewerWith({ memberTeamIds: [randomUUID()] });

      await expect(service.requireRead(team)).rejects.toBeInstanceOf(
        SkillNotFoundError,
      );
    });

    it('lets team admins with the team right change a team skill', async () => {
      const { service, orgId, viewerWith } = setup();
      const teamId = randomUUID();
      const { team } = collectiveSkills(orgId, teamId);
      viewerWith({
        memberTeamIds: [teamId],
        adminTeamIds: [teamId],
        teamAdminPermissions: [TeamAdminPermission.TEAM_MANAGE_SKILLS],
      });

      await expect(service.requireWrite(team)).resolves.toBeUndefined();
    });

    it('keeps team admins read-only when the team right is off', async () => {
      const { service, orgId, viewerWith } = setup();
      const teamId = randomUUID();
      const { team } = collectiveSkills(orgId, teamId);
      viewerWith({ memberTeamIds: [teamId], adminTeamIds: [teamId] });

      await expect(service.requireWrite(team)).rejects.toBeInstanceOf(
        UnauthorizedAccessError,
      );
    });

    it('lets admins change but not use a team skill of another team', async () => {
      const { service, orgId, viewerWith } = setup();
      const { team } = collectiveSkills(orgId, randomUUID());
      viewerWith({ isAdmin: true });

      await expect(service.requireRead(team)).resolves.toBeUndefined();
      await expect(service.requireWrite(team)).resolves.toBeUndefined();
      await expect(service.requireUse(team)).rejects.toBeInstanceOf(
        UnauthorizedAccessError,
      );
    });

    it('lets holders of the organisation right change organisation skills', async () => {
      const { service, orgId, viewerWith } = setup();
      const { org } = collectiveSkills(orgId, randomUUID());
      viewerWith({ permissions: [Permission.MANAGE_ORG_SKILLS] });

      await expect(service.requireWrite(org)).resolves.toBeUndefined();
    });

    it('keeps organisation skills read-only without the organisation right', async () => {
      const { service, orgId, viewerWith } = setup();
      const { org } = collectiveSkills(orgId, randomUUID());
      viewerWith({});

      await expect(service.requireRead(org)).resolves.toBeUndefined();
      await expect(service.requireWrite(org)).rejects.toBeInstanceOf(
        UnauthorizedAccessError,
      );
    });

    it('hides organisation skills of another organisation', async () => {
      const { service, viewerWith } = setup();
      const { org } = collectiveSkills(randomUUID(), randomUUID());
      viewerWith({ isAdmin: true, permissions: Object.values(Permission) });

      await expect(service.requireRead(org)).rejects.toBeInstanceOf(
        SkillNotFoundError,
      );
    });
  });

  it('requires the own-skills right to change a personal skill', async () => {
    const { service, personal, hasPermission } = setup();
    hasPermission.execute.mockResolvedValue(false);

    await expect(service.requireManage(personal)).rejects.toBeInstanceOf(
      UnauthorizedAccessError,
    );
  });

  describe('pending handover reviewers', () => {
    it('let a reviewer view a personal skill that is up for handover', async () => {
      const { service, personal, reviewer } = setup();
      const foreign = new PersonalSkill({ ...personal, userId: randomUUID() });
      reviewer.execute.mockResolvedValue(true);

      await expect(service.requireView(foreign)).resolves.toBeUndefined();
      await expect(service.requireRead(foreign)).rejects.toBeInstanceOf(
        SkillNotFoundError,
      );
    });

    it('hide the skill from everyone else', async () => {
      const { service, personal } = setup();
      const foreign = new PersonalSkill({ ...personal, userId: randomUUID() });

      await expect(service.requireView(foreign)).rejects.toBeInstanceOf(
        SkillNotFoundError,
      );
    });
  });
});
