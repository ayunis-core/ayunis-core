import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { WorkspaceInstructionsTab } from './WorkspaceInstructionsTab';

const mocks = vi.hoisted(() => ({
  context: undefined as { instruction: string | null } | undefined,
  isLoading: true,
  error: null as Error | null,
}));

vi.mock('@/shared/api/generated/ayunisCoreAPI', () => ({
  useWorkspaceContextControllerFindContext: () => ({
    data: mocks.context,
    isLoading: mocks.isLoading,
    error: mocks.error,
  }),
}));

vi.mock('@/pages/workspace/api/useWorkspaceContextActions', () => ({
  useWorkspaceContextActions: () => ({
    updateInstruction: vi.fn(),
    isSavingInstruction: false,
  }),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

describe('WorkspaceInstructionsTab', () => {
  beforeEach(() => {
    mocks.context = undefined;
    mocks.isLoading = true;
    mocks.error = null;
  });

  it('keeps the tour target mounted while the context loads', () => {
    render(<WorkspaceInstructionsTab workspaceId="workspace-1" />);

    expect(
      document.querySelector('[data-tour="workspace-instruction"]'),
    ).not.toBeNull();
    expect(screen.getByTestId('workspace-instruction-input')).toHaveProperty(
      'disabled',
      true,
    );
  });

  it('enables the textarea once the context is there', () => {
    mocks.isLoading = false;
    mocks.context = { instruction: 'Immer sachlich bleiben.' };

    render(<WorkspaceInstructionsTab workspaceId="workspace-1" />);

    expect(screen.getByTestId('workspace-instruction-input')).toHaveProperty(
      'disabled',
      false,
    );
  });

  it('shows the load error instead of the target when the request fails', () => {
    mocks.isLoading = false;
    mocks.error = new Error('nope');

    render(<WorkspaceInstructionsTab workspaceId="workspace-1" />);

    expect(
      document.querySelector('[data-tour="workspace-instruction"]'),
    ).toBeNull();
    expect(screen.getByText('context.loadError.title')).toBeTruthy();
  });
});
