import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { usePendingHandover } from './useHandoverQueries';

const cachedPending = {
  id: 'request-1',
  resourceType: 'skill',
  resource: { id: 'skill-1', name: 'Protokoll' },
  target: { type: 'org' },
  requestedBy: { userId: 'lena', name: 'Lena Hoffmann' },
  requestedAt: '2026-10-15T09:14:00.000Z',
  status: 'pending',
  viewerIsRequester: true,
  viewerCanReview: false,
  reviewers: [],
};

vi.mock('@/shared/api/generated/ayunisCoreAPI', () => ({
  useHandoverRequestsControllerPending: () => ({
    data: { pending: cachedPending },
    isLoading: false,
  }),
}));

describe('usePendingHandover', () => {
  it('returns the open request while the item can have one', () => {
    const { result } = renderHook(() =>
      usePendingHandover('skill', 'skill-1', true),
    );

    expect(result.current.pending).toEqual(cachedPending);
  });

  it('ignores a cached request once the item is no longer personal', () => {
    const { result } = renderHook(() =>
      usePendingHandover('skill', 'skill-1', false),
    );

    expect(result.current).toEqual({ pending: null, isLoading: false });
  });
});
