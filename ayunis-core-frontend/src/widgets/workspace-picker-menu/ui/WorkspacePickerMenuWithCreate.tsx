import { useTranslation } from 'react-i18next';
import { Plus } from 'lucide-react';
import {
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@ayunis/ui/components/dropdown-menu';
import type { Workspace } from '@/features/workspaces';
import { WorkspacePickerMenu } from './WorkspacePickerMenu';

interface WorkspacePickerMenuWithCreateProps {
  workspaces: Workspace[];
  selectedWorkspaceId?: string | null;
  onSelect: (workspace: Workspace) => void;
  /**
   * Called deferred, after the dropdown has closed. The caller owns the
   * create dialog: it must live outside the dropdown content, which unmounts
   * on close and would take the dialog with it.
   */
  onCreateNew: () => void;
}

/** The picker list plus the trailing "new workspace" entry. */
export function WorkspacePickerMenuWithCreate({
  workspaces,
  selectedWorkspaceId,
  onSelect,
  onCreateNew,
}: Readonly<WorkspacePickerMenuWithCreateProps>) {
  const { t } = useTranslation('workspaces');

  return (
    <>
      <WorkspacePickerMenu
        workspaces={workspaces}
        selectedWorkspaceId={selectedWorkspaceId}
        onSelect={onSelect}
      />
      <DropdownMenuSeparator />
      <DropdownMenuItem
        onClick={() =>
          // Let the menu close before the dialog opens, or focus lands back
          // on the trigger.
          setTimeout(onCreateNew, 0)
        }
      >
        <Plus />
        <span>{t('picker.newWorkspace')}</span>
      </DropdownMenuItem>
    </>
  );
}
