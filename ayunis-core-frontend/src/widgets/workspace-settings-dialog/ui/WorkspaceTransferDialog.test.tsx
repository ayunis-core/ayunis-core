import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Workspace } from '@/features/workspaces';
import { WorkspaceTransferDialog } from './WorkspaceTransferDialog';

const mocks = vi.hoisted(() => ({
  candidates: [] as { id: string; name: string; affiliation: string | null }[],
  isLoading: false,
  isError: false,
  retry: vi.fn(),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
vi.mock(
  '@/widgets/workspace-settings-dialog/api/useOwnershipCandidates',
  () => ({
    useOwnershipCandidates: () => ({
      candidates: mocks.candidates,
      isLoading: mocks.isLoading,
      isError: mocks.isError,
      retry: mocks.retry,
    }),
  }),
);
vi.mock(
  '@/widgets/workspace-settings-dialog/api/useTransferWorkspaceOwnership',
  () => ({
    useTransferWorkspaceOwnership: () => ({
      transfer: vi.fn(),
      isTransferring: false,
    }),
  }),
);

afterEach(() => {
  cleanup();
  mocks.candidates = [];
  mocks.isLoading = false;
  mocks.isError = false;
});

const workspace = {
  id: 'workspace-id',
  name: 'Haushalt 2027',
  accessLevel: 'owner',
} as Workspace;

function renderDialog() {
  render(
    <WorkspaceTransferDialog
      workspace={workspace}
      open
      onOpenChange={vi.fn()}
    />,
  );
}

describe('WorkspaceTransferDialog', () => {
  it('asks to invite someone first when nobody else has access', () => {
    renderDialog();

    expect(
      screen.getByTestId('workspace-transfer-dialog').textContent,
    ).toContain('transferDialog.noCandidates');
    expect(screen.queryByTestId('workspace-transfer-owner')).toBeNull();
    expect(screen.getByTestId('workspace-transfer-confirm')).toHaveProperty(
      'disabled',
      true,
    );
  });

  it('lets the owner pick someone and waits for a choice', () => {
    mocks.candidates = [
      { id: 'lena', name: 'Lena Vogel', affiliation: 'Bauamt' },
    ];
    renderDialog();

    expect(
      screen.getByTestId('workspace-transfer-dialog').textContent,
    ).not.toContain('transferDialog.noCandidates');
    expect(screen.getByTestId('workspace-transfer-owner')).toBeTruthy();
    expect(screen.getByTestId('workspace-transfer-confirm')).toHaveProperty(
      'disabled',
      true,
    );
  });

  it('does not claim nobody is there while the list loads', () => {
    mocks.isLoading = true;
    renderDialog();

    expect(
      screen.getByTestId('workspace-transfer-dialog').textContent,
    ).not.toContain('transferDialog.noCandidates');
  });

  it('offers a retry instead of claiming nobody is there when loading fails', () => {
    mocks.isError = true;
    renderDialog();

    const dialog = screen.getByTestId('workspace-transfer-dialog');
    expect(dialog.textContent).not.toContain('transferDialog.noCandidates');
    screen.getByRole('button', { name: 'transferDialog.retry' }).click();
    expect(mocks.retry).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('workspace-transfer-load-error')).toBeTruthy();
  });
});
