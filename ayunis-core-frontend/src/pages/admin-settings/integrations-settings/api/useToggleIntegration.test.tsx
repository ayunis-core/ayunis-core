import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useToggleIntegration } from './useToggleIntegration';
import type { McpIntegration } from '@/pages/admin-settings/integrations-settings/model/types';

const LIST_QUERY_KEY = ['/mcp-integrations'] as const;

type MutationOptions = {
  onSuccess: () => void;
  onSettled: (data: unknown, error: unknown, variables: { id: string }) => void;
};

const mocks = vi.hoisted(() => ({
  invalidateQueries: vi.fn(),
  enableOptions: undefined as MutationOptions | undefined,
  disableOptions: undefined as MutationOptions | undefined,
}));

vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({ invalidateQueries: mocks.invalidateQueries }),
}));
vi.mock('@/shared/api/generated/ayunisCoreAPI', () => ({
  useMcpIntegrationsControllerEnable: (options: {
    mutation: MutationOptions;
  }) => {
    mocks.enableOptions = options.mutation;
    return { mutate: vi.fn() };
  },
  useMcpIntegrationsControllerDisable: (options: {
    mutation: MutationOptions;
  }) => {
    mocks.disableOptions = options.mutation;
    return { mutate: vi.fn() };
  },
  getMcpIntegrationsControllerListQueryKey: () => LIST_QUERY_KEY,
}));
vi.mock('@/shared/lib/toast', () => ({
  showError: vi.fn(),
  showSuccess: vi.fn(),
}));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

describe(useToggleIntegration.name, () => {
  beforeEach(() => vi.clearAllMocks());

  it.each([
    ['enable', () => mocks.enableOptions],
    ['disable', () => mocks.disableOptions],
  ])('refetches the integrations list after %s succeeds', (_, getOptions) => {
    renderHook(() => useToggleIntegration());

    act(() => getOptions()?.onSuccess());

    expect(mocks.invalidateQueries).toHaveBeenCalledWith({
      queryKey: LIST_QUERY_KEY,
    });
  });

  it('leaves the integration out of togglingIds once the request settles', () => {
    const integration = { id: 'integration-1' } as McpIntegration;
    const { result } = renderHook(() => useToggleIntegration());

    act(() => result.current.toggleIntegration(integration, false));
    expect(result.current.togglingIds.has(integration.id)).toBe(true);

    act(() => mocks.disableOptions?.onSettled(undefined, null, integration));
    expect(result.current.togglingIds.has(integration.id)).toBe(false);
  });
});
