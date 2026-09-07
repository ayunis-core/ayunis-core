import { useTranslation } from 'react-i18next';
import { Check, FolderMinus, Plus } from 'lucide-react';
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
  onClear: () => void;
}

/** Explicit removal, workspace choices, and the trailing creation entry. */
export function WorkspacePickerMenuWithCreate({
  workspaces,
  selectedWorkspaceId,
  onSelect,
  onCreateNew,
  onClear,
}: Readonly<WorkspacePickerMenuWithCreateProps>) {
  const { t } = useTranslation('workspaces');

  return (
    <>
      <DropdownMenuItem data-testid="workspace-picker-none" onClick={onClear}>
        <span
          aria-hidden="true"
          className="flex size-6 shrink-0 items-center justify-center text-muted-foreground"
        >
          <FolderMinus className="size-4" />
        </span>
        <span>{t('picker.noWorkspace')}</span>
        {!selectedWorkspaceId && <Check className="ml-auto size-4" />}
      </DropdownMenuItem>
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
