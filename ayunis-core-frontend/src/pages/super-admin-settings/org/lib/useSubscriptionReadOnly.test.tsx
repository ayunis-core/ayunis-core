import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useSubscriptionReadOnly } from './useSubscriptionReadOnly';

const api = vi.hoisted(() => ({ useFeatureToggles: vi.fn() }));
vi.mock('@/shared/api/generated/ayunisCoreAPI', () => ({
  useAppControllerFeatureToggles: api.useFeatureToggles,
}));

describe('useSubscriptionReadOnly', () => {
  beforeEach(() => vi.clearAllMocks());

  it.each([
    ['loading', undefined, true, null],
    ['missing settings', undefined, false, null],
    ['missing subscription setting', {}, false, null],
    ['failed request', undefined, false, new Error('Settings unavailable')],
    [
      'failed refresh with cached manual management',
      { externalSubscriptionsEnabled: false },
      false,
      new Error('Settings unavailable'),
    ],
  ])('blocks editing with %s', (_state, data, isLoading, error) => {
    api.useFeatureToggles.mockReturnValue({ data, isLoading, error });
    const { result } = renderHook(() => useSubscriptionReadOnly());
    expect(result.current).toBe(true);
  });

  it.each([false, true])('uses resolved external management=%s', (managed) => {
    api.useFeatureToggles.mockReturnValue({
      data: { externalSubscriptionsEnabled: managed },
      isLoading: false,
      error: null,
    });
    const { result } = renderHook(() => useSubscriptionReadOnly());
    expect(result.current).toBe(managed);
  });

  it('restores manual editing after a successful retry and blocks it again after a failed refresh', () => {
    api.useFeatureToggles.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    });
    const { result, rerender } = renderHook(() => useSubscriptionReadOnly());
    expect(result.current).toBe(true);
    act(() => {
      api.useFeatureToggles.mockReturnValue({
        data: { externalSubscriptionsEnabled: false },
        isLoading: false,
        error: null,
      });
      rerender();
    });
    expect(result.current).toBe(false);
    act(() => {
      api.useFeatureToggles.mockReturnValue({
        data: { externalSubscriptionsEnabled: false },
        isLoading: false,
        error: new Error('Settings unavailable'),
      });
      rerender();
    });
    expect(result.current).toBe(true);
  });
});
