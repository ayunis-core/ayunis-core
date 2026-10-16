import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PendingHandover } from '@/features/resource-handover/model/types';
import { useHandoverState } from './useHandoverState';

const mocks = vi.hoisted(() => ({
  pending: null as PendingHandover | null,
  isLoading: false,
}));

vi.mock('@/features/resource-handover/api/useHandoverQueries', () => ({
  usePendingHandover: () => ({
    pending: mocks.pending,
    isLoading: mocks.isLoading,
  }),
}));

const ownItem = {
  id: 'skill-1',
  ownerType: 'personal',
  viewer: { canUse: true },
};

describe('useHandoverState', () => {
  beforeEach(() => {
    mocks.pending = null;
    mocks.isLoading = false;
  });

  it('treats someone else’s personal item as under review before the request loads', () => {
    mocks.isLoading = true;
    const { result } = renderHook(() =>
      useHandoverState('skill', { ...ownItem, viewer: { canUse: false } }),
    );

    expect(result.current).toMatchObject({
      isReviewing: true,
      mayHandOver: false,
    });
  });

  it('offers the handover on an own item only once no open request exists', () => {
    mocks.isLoading = true;
    const loading = renderHook(() => useHandoverState('skill', ownItem));
    expect(loading.result.current.mayHandOver).toBe(false);

    mocks.isLoading = false;
    const loaded = renderHook(() => useHandoverState('skill', ownItem));
    expect(loaded.result.current).toMatchObject({
      isReviewing: false,
      mayHandOver: true,
    });
  });

  it('never offers a handover for team items', () => {
    const { result } = renderHook(() =>
      useHandoverState('skill', { ...ownItem, ownerType: 'team' }),
    );

    expect(result.current.mayHandOver).toBe(false);
  });
});
