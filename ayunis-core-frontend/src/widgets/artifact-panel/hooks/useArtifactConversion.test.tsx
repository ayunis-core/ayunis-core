import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type * as SharedApi from '@/shared/api';
import type * as Workspaces from '@/features/workspaces';
import type { ConfirmationOptions } from '@/widgets/confirmation-modal';
import { useArtifactConversion } from './useArtifactConversion';

const mocks = vi.hoisted(() => ({
  convert: vi.fn(),
  confirm: vi.fn(),
  showError: vi.fn(),
  workspace: {
    role: 'user',
    permissions: [] as string[],
  },
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
vi.mock('@/shared/lib/toast', () => ({ showError: mocks.showError }));
vi.mock('@/widgets/confirmation-modal', () => ({
  useConfirmation: () => ({ confirm: mocks.confirm }),
}));
vi.mock('@/shared/api', async (importOriginal) => ({
  ...(await importOriginal<typeof SharedApi>()),
  artifactsControllerConvertToNormal: mocks.convert,
  useAuthenticationControllerMe: () => ({ data: { id: 'member-id' } }),
}));
vi.mock('@/features/workspaces', async (importOriginal) => ({
  ...(await importOriginal<typeof Workspaces>()),
  useWorkspace: () => ({ workspace: mocks.workspace, isLoading: false }),
}));

function workspaceArtifact(creatorId: string) {
  return {
    id: 'artifact-id',
    title: 'Bescheid',
    ownerType: 'workspace' as const,
    creatorId,
  };
}

function renderConversion() {
  const queryClient = new QueryClient();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return renderHook(() => useArtifactConversion('workspace-id'), { wrapper })
    .result;
}

function warning(): ConfirmationOptions {
  return mocks.confirm.mock.calls[0][0] as ConfirmationOptions;
}

describe('useArtifactConversion', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.convert.mockResolvedValue(undefined);
  });

  it('gives a member who may not convert a colleague’s anonymous workspace artifact an error instead of the warning, and converts nothing', async () => {
    const result = renderConversion();

    let converted: boolean | undefined;
    await act(async () => {
      converted = await result.current(workspaceArtifact('colleague-id'));
    });

    expect(converted).toBe(false);
    expect(mocks.showError).toHaveBeenCalledWith('conversion.forbidden');
    expect(mocks.confirm).not.toHaveBeenCalled();
    expect(mocks.convert).not.toHaveBeenCalled();
  });

  it('converts the creator’s artifact once the warning is confirmed', async () => {
    const result = renderConversion();

    let conversion: Promise<boolean> | undefined;
    act(() => {
      conversion = result.current(workspaceArtifact('member-id'));
    });
    expect(mocks.convert).not.toHaveBeenCalled();
    await act(async () => {
      await warning().onConfirm();
    });

    expect(await conversion).toBe(true);
    expect(mocks.convert).toHaveBeenCalledWith('artifact-id');
  });

  it('converts nothing when the warning is dismissed', async () => {
    const result = renderConversion();

    let conversion: Promise<boolean> | undefined;
    act(() => {
      conversion = result.current(workspaceArtifact('member-id'));
    });
    warning().onCancel?.();

    expect(await conversion).toBe(false);
    expect(mocks.convert).not.toHaveBeenCalled();
  });
});
