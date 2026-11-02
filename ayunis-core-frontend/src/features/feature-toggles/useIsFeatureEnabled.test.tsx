import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useIsFeatureEnabled } from './useIsFeatureEnabled';

const api = vi.hoisted(() => ({ useFeatureToggles: vi.fn() }));
vi.mock('@/shared/api/generated/ayunisCoreAPI', () => ({
  useAppControllerFeatureToggles: api.useFeatureToggles,
}));

describe('useIsFeatureEnabled', () => {
  beforeEach(() => vi.clearAllMocks());

  it.each([
    ['loading', undefined, null],
    ['failed', undefined, new Error('Settings unavailable')],
    [
      'failed refresh with cached data',
      { externalSubscriptionsEnabled: true },
      new Error('Settings unavailable'),
    ],
  ])(
    'does not enable a feature while settings are %s',
    (_state, data, error) => {
      api.useFeatureToggles.mockReturnValue({ data, error, isLoading: !error });
      const { result } = renderHook(() =>
        useIsFeatureEnabled('externalSubscriptionsEnabled'),
      );
      expect(result.current).toBe(false);
    },
  );

  it.each([false, true])('returns the resolved feature value %s', (enabled) => {
    api.useFeatureToggles.mockReturnValue({
      data: { externalSubscriptionsEnabled: enabled },
      error: null,
      isLoading: false,
    });
    const { result } = renderHook(() =>
      useIsFeatureEnabled('externalSubscriptionsEnabled'),
    );
    expect(result.current).toBe(enabled);
  });
});
