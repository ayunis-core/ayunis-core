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
      <DropdownMenuItem onClick={onCreateNew}>
        <Plus />
        <span>{t('picker.newWorkspace')}</span>
      </DropdownMenuItem>
    </>
  );
}
