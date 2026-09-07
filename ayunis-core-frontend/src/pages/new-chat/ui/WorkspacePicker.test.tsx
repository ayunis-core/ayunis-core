import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { WorkspacePicker } from './WorkspacePicker';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
vi.mock('@/features/workspaces', () => ({
  useWorkspaces: () => ({
    workspaces: [
      { id: 'workspace-a', name: 'Workspace A', icon: null, color: null },
    ],
  }),
}));
vi.mock('@/widgets/create-workspace-dialog', () => ({
  CreateWorkspaceDialog: () => null,
}));

afterEach(cleanup);

describe('WorkspacePicker', () => {
  it.each(['workspace-a', null])(
    'offers explicit removal with selection %s',
    async (workspaceId) => {
      const onWorkspaceChange = vi.fn();
      render(
        <WorkspacePicker
          workspaceId={workspaceId}
          onWorkspaceChange={onWorkspaceChange}
        />,
      );
      fireEvent.keyDown(screen.getByRole('button'), { key: 'ArrowDown' });
      await screen.findByRole('menu');
      const none = screen.getByTestId('workspace-picker-none');
      expect(screen.getAllByRole('menuitem')[0]).toBe(none);
      expect(none.textContent).toBe('picker.noWorkspace');
      expect(none.querySelector('.lucide-check') !== null).toBe(
        workspaceId === null,
      );
      fireEvent.click(none);
      expect(onWorkspaceChange).toHaveBeenCalledWith(null);
    },
  );
});
