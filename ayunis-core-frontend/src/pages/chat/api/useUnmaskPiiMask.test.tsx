import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  PiiCategory,
  type PiiMaskResponseDto,
} from '@/shared/api/generated/ayunisCoreAPI.schemas';
import { useUnmaskPiiMask } from './useUnmaskPiiMask';

interface UnmaskVariables {
  id: string;
  maskId: string;
}

interface MutationOptions {
  onSuccess: (
    masks: PiiMaskResponseDto[],
    variables: UnmaskVariables,
  ) => void | Promise<void>;
}

const mocks = vi.hoisted(() => ({
  mutate: vi.fn(),
  mutationOptions: undefined as MutationOptions | undefined,
}));

vi.mock('@/shared/api', () => ({
  getThreadsControllerFindOneQueryKey: (threadId: string) => [
    'thread',
    threadId,
  ],
  useThreadsControllerUnmaskPiiMask: (options: {
    mutation: MutationOptions;
  }) => {
    mocks.mutationOptions = options.mutation;
    return { mutate: mocks.mutate, isPending: false };
  },
}));

vi.mock('@/shared/lib/toast', () => ({
  showError: vi.fn(),
  showSuccess: vi.fn(),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

const masks: PiiMaskResponseDto[] = [
  {
    id: 'mask-id',
    token: '{{pii:PERSON_NAME_1}}',
    value: 'Erika Mustermann',
    category: PiiCategory.person_name,
    unmasked: true,
  },
];
const concurrentMask: PiiMaskResponseDto = {
  id: 'concurrent-mask-id',
  token: '{{pii:LOCATION_1}}',
  value: 'Rathausplatz',
  category: PiiCategory.location,
  unmasked: false,
};

describe(useUnmaskPiiMask.name, () => {
  beforeEach(() => vi.clearAllMocks());

  it('updates masks without refetching the thread', async () => {
    const queryClient = new QueryClient();
    const invalidateQueries = vi.spyOn(queryClient, 'invalidateQueries');
    const threadQueryKey = ['thread', 'thread-id'];
    queryClient.setQueryData(threadQueryKey, {
      piiMasks: [{ ...masks[0], unmasked: false }, concurrentMask],
    });
    const onSuccess = vi.fn();
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    renderHook(() => useUnmaskPiiMask({ threadId: 'thread-id', onSuccess }), {
      wrapper,
    });

    await act(async () => {
      await mocks.mutationOptions?.onSuccess(masks, {
        id: 'thread-id',
        maskId: 'mask-id',
      });
    });

    expect(onSuccess).toHaveBeenCalledWith(masks);
    expect(queryClient.getQueryData(threadQueryKey)).toMatchObject({
      piiMasks: [...masks, concurrentMask],
    });
    expect(invalidateQueries).not.toHaveBeenCalled();
  });

  it('does not apply an old thread response after navigation', async () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(['thread', 'first-thread'], {
      piiMasks: [{ ...masks[0], unmasked: false }],
    });
    const firstOnSuccess = vi.fn();
    const secondOnSuccess = vi.fn();
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    const { rerender } = renderHook(
      ({ threadId, onSuccess }) => useUnmaskPiiMask({ threadId, onSuccess }),
      {
        initialProps: {
          threadId: 'first-thread',
          onSuccess: firstOnSuccess,
        },
        wrapper,
      },
    );
    const firstMutation = mocks.mutationOptions;
    rerender({ threadId: 'second-thread', onSuccess: secondOnSuccess });

    await act(async () => {
      await firstMutation?.onSuccess(masks, {
        id: 'first-thread',
        maskId: 'mask-id',
      });
    });

    expect(queryClient.getQueryData(['thread', 'first-thread'])).toMatchObject({
      piiMasks: masks,
    });
    expect(firstOnSuccess).not.toHaveBeenCalled();
    expect(secondOnSuccess).not.toHaveBeenCalled();
  });
});
