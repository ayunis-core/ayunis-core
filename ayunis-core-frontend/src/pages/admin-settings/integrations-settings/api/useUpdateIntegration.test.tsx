import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useUpdateIntegration } from './useUpdateIntegration';

const mocks = vi.hoisted(() => ({
  invalidateQueries: vi.fn(),
  mutate: vi.fn(),
  mutationOptions: undefined as
    | {
        onSuccess: (
          data: {
            connectionStatus?: string;
            lastConnectionError?: string;
            configSchema?: {
              authType?: string;
              oauth?: { clientRegistration: 'automatic' | 'static' };
            };
            userAuthorizationRequired?: boolean;
          },
          variables?: { data: Record<string, unknown> },
        ) => void;
        onError: (error: unknown) => void;
      }
    | undefined,
  errorCode: 'UNKNOWN',
  showError: vi.fn(),
  showSuccess: vi.fn(),
}));

vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({ invalidateQueries: mocks.invalidateQueries }),
}));
vi.mock('@/shared/api/generated/ayunisCoreAPI', () => ({
  getMcpIntegrationsControllerListQueryKey: () => ['integrations'],
  useMcpIntegrationsControllerUpdate: (options: {
    mutation: {
      onSuccess: (
        data: {
          connectionStatus?: string;
          lastConnectionError?: string;
          configSchema?: {
            authType?: string;
            oauth?: { clientRegistration: 'automatic' | 'static' };
          };
          userAuthorizationRequired?: boolean;
        },
        variables?: { data: Record<string, unknown> },
      ) => void;
      onError: (error: unknown) => void;
    };
  }) => {
    mocks.mutationOptions = options.mutation;
    return { mutate: mocks.mutate, isPending: false };
  },
}));
vi.mock('@/shared/lib/toast', () => ({
  showError: mocks.showError,
  showSuccess: mocks.showSuccess,
}));
vi.mock('@/shared/api/extract-error-data', () => ({
  default: () => ({ code: mocks.errorCode }),
}));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: { message?: string }) =>
      options?.message ? `${key}:${options.message}` : key,
  }),
}));

describe(useUpdateIntegration.name, () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.errorCode = 'UNKNOWN';
  });

  it('reports a failed connection and keeps the edit dialog open', () => {
    const onSuccess = vi.fn();
    renderHook(() => useUpdateIntegration(onSuccess));

    act(() => {
      mocks.mutationOptions?.onSuccess(
        {
          connectionStatus: 'error',
          lastConnectionError: 'Authentication failed',
        },
        { data: { serverUrl: 'https://broken.example.com/mcp' } },
      );
    });

    expect(mocks.showError).toHaveBeenCalledWith(
      'integrations.updateIntegration.connectionFailed:Authentication failed',
    );
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it('does not describe an existing error as a new connection test failure', () => {
    const onSuccess = vi.fn();
    renderHook(() => useUpdateIntegration(onSuccess));

    act(() => {
      mocks.mutationOptions?.onSuccess(
        {
          connectionStatus: 'error',
          lastConnectionError: 'Existing connection error',
        },
        { data: { name: 'Renamed integration' } },
      );
    });

    expect(mocks.showSuccess).toHaveBeenCalledWith(
      'integrations.updateIntegration.success',
    );
    expect(onSuccess).toHaveBeenCalledOnce();
  });

  it('does not report an OAuth save as a failed connection test', () => {
    const onSuccess = vi.fn();
    renderHook(() => useUpdateIntegration(onSuccess));

    act(() => {
      mocks.mutationOptions?.onSuccess(
        {
          connectionStatus: 'error',
          lastConnectionError: 'Existing OAuth connection error',
          configSchema: {
            authType: 'OAUTH',
            oauth: { clientRegistration: 'automatic' },
          },
        },
        { data: { orgConfigValues: { tenant: 'council-42' } } },
      );
    });

    expect(mocks.showSuccess).toHaveBeenCalledWith(
      'integrations.updateIntegration.success',
    );
    expect(onSuccess).toHaveBeenCalledOnce();
  });

  it('does not report a user-config save as a failed connection test', () => {
    const onSuccess = vi.fn();
    renderHook(() => useUpdateIntegration(onSuccess));

    act(() => {
      mocks.mutationOptions?.onSuccess(
        {
          connectionStatus: 'error',
          lastConnectionError: 'Existing user connection error',
          userAuthorizationRequired: true,
        },
        { data: { serverUrl: 'https://new.example.com/mcp' } },
      );
    });

    expect(mocks.showSuccess).toHaveBeenCalledWith(
      'integrations.updateIntegration.success',
    );
    expect(onSuccess).toHaveBeenCalledOnce();
  });

  it('reports a successful connection and closes the edit dialog', () => {
    const onSuccess = vi.fn();
    renderHook(() => useUpdateIntegration(onSuccess));

    act(() => {
      mocks.mutationOptions?.onSuccess(
        { connectionStatus: 'connected' },
        { data: { serverUrl: 'https://working.example.com/mcp' } },
      );
    });

    expect(mocks.showSuccess).toHaveBeenCalledWith(
      'integrations.updateIntegration.success',
    );
    expect(onSuccess).toHaveBeenCalledOnce();
  });

  it.each([
    ['MCP_VALIDATION_FAILED', 'invalidConfiguration'],
    ['MCP_MISSING_REQUIRED_CONFIG', 'missingRequiredConfiguration'],
  ])('reports %s with a specific configuration error', (code, messageKey) => {
    mocks.errorCode = code;
    renderHook(() => useUpdateIntegration());

    act(() => {
      mocks.mutationOptions?.onError(new Error('request failed'));
    });

    expect(mocks.showError).toHaveBeenCalledWith(
      `integrations.updateIntegration.${messageKey}`,
    );
  });
});
