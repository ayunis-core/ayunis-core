import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { getHandoverRequestsControllerListQueryKey } from '@/shared/api/generated/ayunisCoreAPI';
import type { HandoverRequest } from '@/features/resource-handover/model/types';
import { useDecideHandover } from './useHandoverActions';

vi.mock('@/shared/api/generated/ayunisCoreAPI', () => ({
  getHandoverRequestsControllerListQueryKey: (params: object) => [
    '/handover-requests',
    params,
  ],
  handoverRequestsControllerApprove: vi.fn().mockResolvedValue({}),
  handoverRequestsControllerReject: vi.fn().mockResolvedValue({}),
  handoverRequestsControllerCreate: vi.fn(),
  handoverRequestsControllerWithdraw: vi.fn(),
}));

vi.mock('@/features/resource-handover/api/useRefreshHandoverViews', () => ({
  useRefreshHandoverViews: () => vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/features/resource-handover/model/useHandoverCopy', () => ({
  useHandoverCopy: () => ({ text: () => 'copy', t: () => 'copy' }),
}));

vi.mock('@/shared/lib/toast', () => ({
  showSuccess: vi.fn(),
  showError: vi.fn(),
}));

function request(id: string): HandoverRequest {
  return {
    id,
    resourceType: 'skill',
    resource: { id: `skill-${id}`, name: 'Protokoll' },
    target: { type: 'org' },
    requestedBy: { userId: 'lena', name: 'Lena Hoffmann' },
    requestedAt: '2026-10-15T09:14:00.000Z',
    status: 'pending',
    viewerIsRequester: false,
    viewerCanReview: true,
    reviewers: [],
  } as HandoverRequest;
}

describe('useDecideHandover', () => {
  it('drops the decided request from the cached list before leaving the item', async () => {
    const queryClient = new QueryClient();
    const listKey = getHandoverRequestsControllerListQueryKey({
      resourceType: 'skill',
    });
    queryClient.setQueryData(listKey, [request('r1'), request('r2')]);
    let listWhenLeaving: HandoverRequest[] | undefined;
    const onDecided = vi.fn(() => {
      listWhenLeaving = queryClient.getQueryData(listKey);
    });
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    const { result } = renderHook(() => useDecideHandover('skill', onDecided), {
      wrapper,
    });

    await act(() =>
      result.current.mutateAsync({
        request: request('r1'),
        decision: 'approve',
      }),
    );

    expect(onDecided).toHaveBeenCalledTimes(1);
    expect(listWhenLeaving?.map(({ id }) => id)).toEqual(['r2']);
  });
});
