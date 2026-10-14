import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useDeleteSuperAdminInvite } from './useDeleteSuperAdminInvite';

const state = vi.hoisted(() => ({
  onError: undefined as ((error: Error) => void) | undefined,
  showError: vi.fn(),
}));
vi.mock('@tanstack/react-query', () => ({
  useMutation: (options: { onError: (error: Error) => void }) => {
    state.onError = options.onError;
    return {};
  },
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
}));
vi.mock('@tanstack/react-router', () => ({
  useRouter: () => ({ invalidate: vi.fn() }),
}));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
vi.mock('@/shared/lib/toast', () => ({
  showError: state.showError,
  showSuccess: vi.fn(),
}));
vi.mock('@/shared/api/extract-error-data', () => ({
  default: () => {
    throw new Error('Network failure');
  },
}));

describe(useDeleteSuperAdminInvite.name, () => {
  it('shows a leaf translation for network failures', () => {
    renderHook(() => useDeleteSuperAdminInvite());
    state.onError?.(new Error('Network failure'));
    expect(state.showError).toHaveBeenCalledWith(
      'inviteDelete.error.unexpectedError',
    );
  });
});
