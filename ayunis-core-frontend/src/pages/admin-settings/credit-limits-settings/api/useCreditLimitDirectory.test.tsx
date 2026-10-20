import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useCreditLimitDirectory } from './useCreditLimitDirectory';

interface QueryState<T> {
  data?: T;
  isPending: boolean;
  isFetchedAfterMount?: boolean;
  isError: boolean;
  refetch: () => Promise<unknown>;
}

function loaded<T>(data: T): QueryState<T> {
  return {
    data,
    isPending: false,
    isFetchedAfterMount: true,
    isError: false,
    refetch: vi.fn(),
  };
}

const api = vi.hoisted(() => ({
  users: vi.fn(),
  teams: vi.fn(),
  userLimits: vi.fn(),
  teamLimits: vi.fn(),
  defaultLimit: vi.fn(),
  userUsage: vi.fn(),
}));
vi.mock('@/shared/api', () => ({
  useUserControllerGetUsersInOrganization: api.users,
  useTeamsControllerListTeams: api.teams,
  useCreditLimitsControllerGetUserLimits: api.userLimits,
  useCreditLimitsControllerGetTeamLimits: api.teamLimits,
  useCreditLimitsControllerGetDefaultUserLimit: api.defaultLimit,
  useCreditLimitsControllerGetUserUsage: api.userUsage,
  useUsageControllerGetCreditUsage: vi.fn(),
}));

const alice = { id: 'alice', name: 'Alice', email: 'alice@example.test' };
const bob = { id: 'bob', name: 'Bob', email: 'bob@example.test' };
const carol = { id: 'carol', name: 'Carol', email: 'carol@example.test' };
const usersFilters = { tab: 'users' as const, page: 1 };

function usageCall() {
  const calls = api.userUsage.mock.calls as [
    { userIds: string[] },
    { query: { enabled: boolean } },
  ][];
  const [params, options] = calls.at(-1)!;
  return { userIds: params.userIds, enabled: options.query.enabled };
}

describe('useCreditLimitDirectory', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    api.users.mockReturnValue(
      loaded({ data: [alice, bob, carol], pagination: { total: 3 } }),
    );
    api.teams.mockReturnValue(loaded([]));
    api.userLimits.mockReturnValue(
      loaded([{ userId: 'bob', monthlyCredits: 300, creditsUsed: 20 }]),
    );
    api.teamLimits.mockReturnValue(loaded([]));
    api.defaultLimit.mockReturnValue(loaded({ monthlyCredits: 100 }));
    api.userUsage.mockReturnValue(
      loaded([
        { userId: 'alice', creditsUsed: 120 },
        { userId: 'carol', creditsUsed: 0 },
      ]),
    );
  });

  it('loads consumption only for users on the default and attaches it to their rows', () => {
    const { result } = renderHook(() =>
      useCreditLimitDirectory(usersFilters, true),
    );

    expect(usageCall()).toEqual({ userIds: ['alice', 'carol'], enabled: true });
    expect(result.current.rows).toEqual([
      { ...alice, limit: null, creditsUsed: 120 },
      {
        ...bob,
        limit: { userId: 'bob', monthlyCredits: 300, creditsUsed: 20 },
        creditsUsed: undefined,
      },
      { ...carol, limit: null, creditsUsed: 0 },
    ]);
    expect(result.current.isPending).toBe(false);
    expect(result.current.isError).toBe(false);
  });

  it('never asks for consumption without a default and ignores the idle query state', () => {
    api.defaultLimit.mockReturnValue(loaded({ monthlyCredits: null }));
    api.userUsage.mockReturnValue({
      isPending: true,
      isError: false,
      refetch: vi.fn(),
    });

    const { result } = renderHook(() =>
      useCreditLimitDirectory(usersFilters, true),
    );

    expect(usageCall().enabled).toBe(false);
    expect(result.current.isPending).toBe(false);
    expect(result.current.rows).toEqual([
      { ...alice, limit: null, creditsUsed: undefined },
      {
        ...bob,
        limit: { userId: 'bob', monthlyCredits: 300, creditsUsed: 20 },
        creditsUsed: undefined,
      },
      { ...carol, limit: null, creditsUsed: undefined },
    ]);
  });

  it('skips the consumption request when every listed user has an individual limit', () => {
    api.userLimits.mockReturnValue(
      loaded([
        { userId: 'alice', monthlyCredits: 50, creditsUsed: 1 },
        { userId: 'bob', monthlyCredits: 300, creditsUsed: 20 },
        { userId: 'carol', monthlyCredits: 70, creditsUsed: 2 },
      ]),
    );
    api.userUsage.mockReturnValue({
      isPending: true,
      isError: false,
      refetch: vi.fn(),
    });

    const { result } = renderHook(() =>
      useCreditLimitDirectory(usersFilters, true),
    );

    expect(usageCall()).toEqual({ userIds: [], enabled: false });
    expect(result.current.isPending).toBe(false);
  });

  it.each([
    { state: { isPending: true, isError: false }, field: 'isPending' },
    { state: { isPending: false, isError: true }, field: 'isError' },
  ] as const)(
    'surfaces a $field consumption request instead of showing zero usage',
    ({ state, field }) => {
      const refetch = vi.fn().mockResolvedValue(undefined);
      api.userUsage.mockReturnValue({ ...state, refetch });

      const { result } = renderHook(() =>
        useCreditLimitDirectory(usersFilters, true),
      );

      expect(result.current[field]).toBe(true);
      result.current.retry();
      expect(refetch).toHaveBeenCalledTimes(1);
    },
  );

  it('does not request user consumption on the teams tab', () => {
    renderHook(() => useCreditLimitDirectory({ tab: 'teams', page: 1 }, true));

    expect(usageCall().enabled).toBe(false);
  });
});
