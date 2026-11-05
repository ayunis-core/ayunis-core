import { useQueryClient } from '@tanstack/react-query';
import { useNavigate, useRouter } from '@tanstack/react-router';
import {
  getTeamMembersControllerListTeamMembersQueryKey,
  getTeamsControllerGetTeamQueryKey,
  getTeamsControllerListTeamsQueryKey,
  getTeamsControllerListMyTeamsQueryKey,
  useAuthenticationControllerMe,
} from '@/shared/api/generated/ayunisCoreAPI';
import { useAuthorization } from '@/features/permissions';

/**
 * Refreshes everything a membership change affects. When users change their
 * own team role or membership and manage teams only through that role, they may
 * have lost access to this page, so send them back to the teams list instead.
 */
export function useInvalidateTeamMembership(teamId: string) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const navigate = useNavigate();
  const { data: me } = useAuthenticationControllerMe();
  const { canAny } = useAuthorization();

  return async (changedUserId?: string) => {
    await Promise.all(
      [
        getTeamMembersControllerListTeamMembersQueryKey(teamId),
        getTeamsControllerGetTeamQueryKey(teamId),
        getTeamsControllerListTeamsQueryKey(),
        getTeamsControllerListMyTeamsQueryKey(),
      ].map((queryKey) => queryClient.invalidateQueries({ queryKey })),
    );
    const mayHaveLostAccess =
      changedUserId === me?.id &&
      !canAny('manage_teams', 'assign_users_to_teams');
    if (mayHaveLostAccess) {
      await navigate({ to: '/admin-settings/teams' });
      return;
    }
    await router.invalidate();
  };
}
