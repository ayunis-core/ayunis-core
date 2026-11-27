import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from '@ayunis/ui/components/dropdown-menu';
import { WorkspacePickerMenuWithCreate } from './WorkspacePickerMenuWithCreate';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
afterEach(cleanup);

describe('WorkspacePickerMenuWithCreate in a chat submenu', () => {
  it.each(['workspace-a', null])(
    'clears selection %s from inside the workspace submenu',
    async (selectedWorkspaceId) => {
      const onClear = vi.fn();
      const onSelect = vi.fn();
      render(
        <DropdownMenu>
          <DropdownMenuTrigger>Chat actions</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>Workspace</DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                <WorkspacePickerMenuWithCreate
                  workspaces={[]}
                  selectedWorkspaceId={selectedWorkspaceId}
                  onSelect={onSelect}
                  onClear={onClear}
                  onCreateNew={vi.fn()}
                />
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          </DropdownMenuContent>
        </DropdownMenu>,
      );
      fireEvent.keyDown(screen.getByRole('button', { name: 'Chat actions' }), {
        key: 'ArrowDown',
      });
      const trigger = await screen.findByRole('menuitem', {
        name: 'Workspace',
      });
      fireEvent.keyDown(trigger, { key: 'ArrowRight' });
      const none = await screen.findByTestId('workspace-picker-none');
      const submenu = none.closest('[role="menu"]');
      expect(submenu?.querySelector('[role="menuitem"]')).toBe(none);
      expect(
        none
          .querySelector('.lucide-folder-minus')
          ?.classList.contains('size-4'),
      ).toBe(true);
      expect(none.querySelector('.lucide-check') !== null).toBe(
        selectedWorkspaceId === null,
      );
      fireEvent.click(none);
      expect(onClear).toHaveBeenCalledOnce();
      expect(onSelect).not.toHaveBeenCalled();
    },
  );
});
