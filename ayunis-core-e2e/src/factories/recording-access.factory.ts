import type { APIRequestContext } from '@playwright/test';
import { getAuthenticatedPrincipalId, login } from '../clients/api/auth.client';
import {
  getUserRolePermissions,
  setUserRolePermissions,
} from '../clients/api/role-permissions.client';
import { addTeamMember, createTeam } from '../clients/api/teams.client';
import type {
  TeamResponseDto,
  UpdateRolePermissionsDtoPermissionsItem,
} from '../clients/generated/ayunisCoreAPI.schemas';
import type { MailcatcherClient } from '../clients/mailcatcher.client';
import { createApiContext } from './api-context.factory';
import { createOrg, type OrgContext } from './org.factory';
import { createMemberSession } from './user.factory';

type StorageState = Awaited<ReturnType<APIRequestContext['storageState']>>;

export interface RecordingPrincipal {
  id: string;
  api: APIRequestContext;
  storageState: StorageState;
}

export interface RecordingAccessFixture {
  org: OrgContext;
  team: TeamResponseDto;
  /** Org admin and team member: holds every permission. */
  admin: RecordingPrincipal;
  /** Team member whose user role lacks the team and org recording permissions. */
  member: RecordingPrincipal;
  /** Organization member outside the team, with the same user role. */
  outsider: RecordingPrincipal;
  /** Grants the user role exactly the given recording permissions on top of its others. */
  setUserRecordingPermissions: (
    permissions: UpdateRolePermissionsDtoPermissionsItem[],
  ) => Promise<void>;
  dispose: () => Promise<void>;
}

const RECORDING_PERMISSIONS: UpdateRolePermissionsDtoPermissionsItem[] = [
  'manage_recordings',
  'manage_team_recordings',
  'manage_org_recordings',
];

async function principal(api: APIRequestContext): Promise<RecordingPrincipal> {
  return {
    id: await getAuthenticatedPrincipalId(api),
    api,
    storageState: await api.storageState(),
  };
}

/**
 * Its own organization, because it changes the user role: a team with the
 * admin and a member, an organization member outside the team, and a user
 * role holding only `manage_recordings` of the recording permissions.
 */
export async function createRecordingAccessFixture(
  key: string,
  mail: MailcatcherClient,
  storageStatePath: string,
): Promise<RecordingAccessFixture> {
  const org = await createOrg(`recordings-${key}`, storageStatePath);
  const adminApi = await createApiContext({ cookies: [], origins: [] });
  await login(adminApi, org.admin.email, org.admin.password);
  const admin = await principal(adminApi);
  const member = await createMemberSession(adminApi, mail, `rec-m-${key}`);
  const outsider = await createMemberSession(adminApi, mail, `rec-o-${key}`);
  const team = await createTeam(adminApi, `Bauausschuss ${key}`);
  await addTeamMember(adminApi, team.id, admin.id);
  await addTeamMember(adminApi, team.id, member.member.id);

  const otherPermissions = (await getUserRolePermissions(adminApi)).filter(
    (permission) =>
      !RECORDING_PERMISSIONS.includes(
        permission as UpdateRolePermissionsDtoPermissionsItem,
      ),
  ) as UpdateRolePermissionsDtoPermissionsItem[];
  const setUserRecordingPermissions = async (
    permissions: UpdateRolePermissionsDtoPermissionsItem[],
  ) => {
    await setUserRolePermissions(adminApi, [
      ...otherPermissions,
      ...permissions,
    ]);
  };
  await setUserRecordingPermissions(['manage_recordings']);

  return {
    org,
    team,
    admin,
    member: await principal(member.api),
    outsider: await principal(outsider.api),
    setUserRecordingPermissions,
    dispose: async () => {
      await Promise.all(
        [adminApi, member.api, outsider.api].map((api) => api.dispose()),
      );
    },
  };
}
