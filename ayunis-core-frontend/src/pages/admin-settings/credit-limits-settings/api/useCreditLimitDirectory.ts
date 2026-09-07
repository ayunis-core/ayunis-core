import {
  useTeamsControllerListTeams,
  useUserControllerGetUsersInOrganization,
} from '@/shared/api';
import {
  useTeamLimitOverview,
  useUserLimitOverview,
} from '@/features/credit-limits/api/useCreditLimitQueries';
import {
  CREDIT_LIMIT_PAGE_SIZE,
  type CreditLimitSearch,
} from '@/features/credit-limits/model/credit-limit-settings';

export function useCreditLimitDirectory(
  filters: CreditLimitSearch,
  enabled: boolean,
) {
  const usersActive = filters.tab === 'users';
  const offset = (filters.page - 1) * CREDIT_LIMIT_PAGE_SIZE;
  const users = useUserControllerGetUsersInOrganization(
    { search: filters.search, limit: CREDIT_LIMIT_PAGE_SIZE, offset },
    { query: { enabled: enabled && usersActive } },
  );
  const teams = useTeamsControllerListTeams({
    query: { enabled: enabled && !usersActive },
  });
  const userLimits = useUserLimitOverview(enabled && usersActive);
  const teamLimits = useTeamLimitOverview(enabled && !usersActive);
  const filteredTeams = (teams.data ?? []).filter((team) =>
    team.name
      .toLocaleLowerCase()
      .includes((filters.search ?? '').toLocaleLowerCase()),
  );
  const directory = usersActive ? users : teams;
  const limits = usersActive ? userLimits : teamLimits;
  const rows = usersActive
    ? (users.data?.data ?? []).map((user) => ({
        ...user,
        limit: userLimits.limits.get(user.id) ?? null,
      }))
    : filteredTeams
        .slice(offset, offset + CREDIT_LIMIT_PAGE_SIZE)
        .map((team) => ({
          ...team,
          limit: teamLimits.limits.get(team.id) ?? null,
        }));
  return {
    rows,
    total: usersActive
      ? (users.data?.pagination.total ?? 0)
      : filteredTeams.length,
    isPending: directory.isPending || limits.isPending,
    isError: directory.isError || limits.isError,
    retry: () => {
      void directory.refetch();
      void limits.refetch();
    },
  };
}
