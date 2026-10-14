import { renderHook } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import {
  useUserLimitOverview,
  useTeamLimitOverview,
} from './useCreditLimitQueries';
const { query } = vi.hoisted(() => ({
  query: {
    data: [{ userId: 'anna', monthlyCredits: 5000, creditsUsed: 1240 }],
    isPending: false,
    isFetching: true,
    isError: false,
    isFetchedAfterMount: false,
  },
}));
vi.mock('@/shared/api', () => ({
  useCreditLimitsControllerGetUserLimits: () => query,
  useCreditLimitsControllerGetTeamLimits: () => query,
}));
it('treats cached consumption as pending while checking the current privacy policy', () => {
  const { result } = renderHook(() => useUserLimitOverview(true));
  expect(result.current.isPending).toBe(true);
});

it('preserves the loaded table during a background consumption refresh', () => {
  query.isFetchedAfterMount = true;
  const { result } = renderHook(() => useUserLimitOverview(true));
  expect(result.current.isPending).toBe(false);
});

beforeEach(() => {
  query.isFetchedAfterMount = false;
});
it('checks current privacy before exposing cached team consumption', () => {
  const { result } = renderHook(() => useTeamLimitOverview(true));
  expect(result.current.isPending).toBe(true);
});
it('keeps team rows mounted on a background refresh', () => {
  query.isFetchedAfterMount = true;
  const { result } = renderHook(() => useTeamLimitOverview(true));
  expect(result.current.isPending).toBe(false);
});
