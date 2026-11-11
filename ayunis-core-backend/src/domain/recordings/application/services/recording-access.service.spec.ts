import { randomUUID, type UUID } from 'crypto';
import type { ContextService } from 'src/common/context/services/context.service';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { RecordingNotFoundError } from 'src/domain/recordings/application/recordings.errors';
import { OrgRecording } from 'src/domain/recordings/domain/org-recording.entity';
import { PersonalRecording } from 'src/domain/recordings/domain/personal-recording.entity';
import { TeamRecording } from 'src/domain/recordings/domain/team-recording.entity';
import { WorkspaceRecording } from 'src/domain/recordings/domain/workspace-recording.entity';
import type { AssertWorkspaceReadAccessUseCase } from 'src/domain/workspaces/application/use-cases/assert-workspace-read-access/assert-workspace-read-access.use-case';
import type { AssertWorkspaceWriteAccessUseCase } from 'src/domain/workspaces/application/use-cases/assert-workspace-write-access/assert-workspace-write-access.use-case';
import { WorkspaceNotFoundError } from 'src/domain/workspaces/application/workspaces.errors';
import { Permission } from 'src/iam/permissions/domain/value-objects/permission.enum';
import type { GetCollectiveOwnerAccessQuery } from 'src/iam/teams/application/use-cases/get-collective-owner-access/get-collective-owner-access.query';
import type { GetCollectiveOwnerAccessUseCase } from 'src/iam/teams/application/use-cases/get-collective-owner-access/get-collective-owner-access.use-case';
import type { ListReadableCollectiveOwnersUseCase } from 'src/iam/teams/application/use-cases/list-readable-collective-owners/list-readable-collective-owners.use-case';
import { UserRole } from 'src/iam/users/domain/value-objects/role.object';
import { SystemRole } from 'src/iam/users/domain/value-objects/system-role.enum';
import { CollectiveRecordingAccessService } from './collective-recording-access.service';
import { RecordingAccessService } from './recording-access.service';

describe(RecordingAccessService.name, () => {
  const orgId = randomUUID();
  const userId = randomUUID();
  const ownTeamId = randomUUID();
  const otherTeamId = randomUUID();
  const ownWorkspaceId = randomUUID();
  const recording = {
    name: 'Stadtratssitzung',
    orgId,
    createdByUserId: userId,
  };

  /**
   * Stands in for the teams policy: members read their teams, everyone their
   * organization, and managing takes the held permissions for that owner.
   */
  function setup(held: Permission[]) {
    const getOwnerAccess = {
      execute: ({ owner, permissions }: GetCollectiveOwnerAccessQuery) => {
        const canRead =
          owner.type === 'team'
            ? owner.teamId === ownTeamId
            : owner.orgId === orgId;
        const ownerPermission =
          owner.type === 'team' ? permissions?.team : permissions?.org;
        const canManage =
          canRead &&
          !!permissions &&
          held.includes(permissions.manage) &&
          !!ownerPermission &&
          held.includes(ownerPermission);
        return Promise.resolve({ canRead, canManage });
      },
    };
    const workspaceAccess = {
      execute: ({ workspaceId }: { workspaceId: UUID }) =>
        workspaceId === ownWorkspaceId
          ? Promise.resolve()
          : Promise.reject(new WorkspaceNotFoundError(workspaceId)),
    };
    const context = {
      get: (key: string) =>
        ({
          userId,
          orgId,
          role: UserRole.USER,
          systemRole: SystemRole.CUSTOMER,
          principalType: 'user',
        })[key],
    };
    return new RecordingAccessService(
      context as unknown as ContextService,
      new CollectiveRecordingAccessService(
        getOwnerAccess as unknown as GetCollectiveOwnerAccessUseCase,
        {} as ListReadableCollectiveOwnersUseCase,
      ),
      workspaceAccess as unknown as AssertWorkspaceReadAccessUseCase,
      workspaceAccess as unknown as AssertWorkspaceWriteAccessUseCase,
    );
  }

  const allRecordingPermissions = [
    Permission.MANAGE_RECORDINGS,
    Permission.MANAGE_TEAM_RECORDINGS,
    Permission.MANAGE_ORG_RECORDINGS,
  ];

  it("hides another user's personal recording", async () => {
    const access = setup(allRecordingPermissions);
    const colleagues = new PersonalRecording({
      ...recording,
      userId: randomUUID(),
    });

    await expect(access.requireRead(colleagues)).rejects.toBeInstanceOf(
      RecordingNotFoundError,
    );
    await expect(access.requireWrite(colleagues)).rejects.toBeInstanceOf(
      RecordingNotFoundError,
    );
  });

  it("hides another organization's recording, even its own org recording", async () => {
    const access = setup(allRecordingPermissions);
    const foreign = new OrgRecording({ ...recording, orgId: randomUUID() });

    await expect(access.requireRead(foreign)).rejects.toBeInstanceOf(
      RecordingNotFoundError,
    );
  });

  it('hides team recordings from organization members outside the team', async () => {
    const access = setup(allRecordingPermissions);
    const otherTeams = new TeamRecording({ ...recording, teamId: otherTeamId });

    await expect(access.requireRead(otherTeams)).rejects.toBeInstanceOf(
      RecordingNotFoundError,
    );
    await expect(access.requireWrite(otherTeams)).rejects.toBeInstanceOf(
      RecordingNotFoundError,
    );
  });

  it('lets team members without manage_team_recordings read but not manage team recordings', async () => {
    const access = setup([
      Permission.MANAGE_RECORDINGS,
      Permission.MANAGE_ORG_RECORDINGS,
      Permission.SHARE_KNOWLEDGE_BASES_WITH_TEAMS,
    ]);
    const teams = new TeamRecording({ ...recording, teamId: ownTeamId });

    await expect(access.requireRead(teams)).resolves.toBeUndefined();
    await expect(access.requireWrite(teams)).rejects.toBeInstanceOf(
      UnauthorizedAccessError,
    );
    await expect(access.requireCreate(teams)).rejects.toBeInstanceOf(
      UnauthorizedAccessError,
    );
  });

  it('lets organization members without manage_org_recordings read but not manage org recordings', async () => {
    const access = setup([
      Permission.MANAGE_RECORDINGS,
      Permission.MANAGE_TEAM_RECORDINGS,
    ]);
    const orgs = new OrgRecording(recording);

    await expect(access.requireRead(orgs)).resolves.toBeUndefined();
    await expect(access.requireWrite(orgs)).rejects.toBeInstanceOf(
      UnauthorizedAccessError,
    );
  });

  it('lets holders of manage_recordings and the owner permission manage team and org recordings', async () => {
    const access = setup(allRecordingPermissions);

    await expect(
      access.requireWrite(
        new TeamRecording({ ...recording, teamId: ownTeamId }),
      ),
    ).resolves.toBeUndefined();
    await expect(
      access.requireWrite(new OrgRecording(recording)),
    ).resolves.toBeUndefined();
  });

  it('hides recordings of workspaces the user cannot access', async () => {
    const access = setup(allRecordingPermissions);
    const foreign = new WorkspaceRecording({
      ...recording,
      workspaceId: randomUUID(),
    });

    await expect(access.requireRead(foreign)).rejects.toBeInstanceOf(
      RecordingNotFoundError,
    );
    await expect(access.requireWrite(foreign)).rejects.toBeInstanceOf(
      RecordingNotFoundError,
    );
    await expect(
      access.requireWrite(
        new WorkspaceRecording({ ...recording, workspaceId: ownWorkspaceId }),
      ),
    ).resolves.toBeUndefined();
  });
});
