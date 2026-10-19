import {
  useTeamsControllerListTeams,
  useUserControllerGetUsersInOrganization,
} from '@/shared/api';
import {
  useDefaultUserLimit,
  useTeamLimitOverview,
  useUserCreditUsage,
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
  const defaultLimit = useDefaultUserLimit(enabled && usersActive);
  const pageUsers = users.data?.data ?? [];
  const defaultUserIds = pageUsers
    .filter((user) => !userLimits.limits.has(user.id))
    .map((user) => user.id);
  const usageActive =
    enabled && usersActive && defaultLimit.defaultLimit !== null;
  const defaultUsage = useUserCreditUsage(defaultUserIds, usageActive);
  const filteredTeams = (teams.data ?? []).filter((team) =>
    team.name
      .toLocaleLowerCase()
      .includes((filters.search ?? '').toLocaleLowerCase()),
  );
  const directory = usersActive ? users : teams;
  const limits = usersActive ? userLimits : teamLimits;
  const rows = usersActive
    ? pageUsers.map((user) => ({
        ...user,
        limit: userLimits.limits.get(user.id) ?? null,
        creditsUsed: defaultUsage.usage.get(user.id),
      }))
    : filteredTeams
        .slice(offset, offset + CREDIT_LIMIT_PAGE_SIZE)
        .map((team) => ({
          ...team,
          limit: teamLimits.limits.get(team.id) ?? null,
        }));
  const usageRequested = usageActive && defaultUserIds.length > 0;
  const defaultPending =
    (usersActive && defaultLimit.isPending) ||
    (usageRequested && defaultUsage.isPending);
  const defaultError =
    (usersActive && defaultLimit.isError) ||
    (usageRequested && defaultUsage.isError);
  return {
    rows,
    defaultLimit: defaultLimit.defaultLimit,
    total: usersActive
      ? (users.data?.pagination.total ?? 0)
      : filteredTeams.length,
    isPending: directory.isPending || limits.isPending || defaultPending,
    isError: directory.isError || limits.isError || defaultError,
    retry: () => {
      void directory.refetch();
      void limits.refetch();
      if (usersActive) void defaultLimit.refetch();
      if (usageRequested) void defaultUsage.refetch();
    },
  };
}
