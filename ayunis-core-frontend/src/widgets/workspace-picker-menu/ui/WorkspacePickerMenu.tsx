import { useTranslation } from 'react-i18next';
import { Check } from 'lucide-react';
import { DropdownMenuItem } from '@ayunis/ui/components/dropdown-menu';
import { WorkspaceIcon } from '@/shared/ui/workspace-icon';
import type { Workspace } from '@/features/workspaces';

interface WorkspacePickerMenuProps {
  workspaces: Workspace[];
  selectedWorkspaceId?: string | null;
  onSelect: (workspace: Workspace) => void;
}

/**
 * The list body shared by every "pick a workspace" menu (sidebar chat menu,
 * new-chat picker). Callers own the surrounding DropdownMenu and any extra
 * items such as "new workspace".
 */
export function WorkspacePickerMenu({
  workspaces,
  selectedWorkspaceId,
  onSelect,
}: Readonly<WorkspacePickerMenuProps>) {
  const { t } = useTranslation('workspaces');

  if (workspaces.length === 0) {
    return (
      <div className="px-2 py-1.5 text-sm text-muted-foreground">
        {t('picker.empty')}
      </div>
    );
  }

  return (
    <div className="max-h-72 overflow-y-auto">
      {workspaces.map((workspace) => (
        <DropdownMenuItem
          key={workspace.id}
          onClick={() => onSelect(workspace)}
        >
          <WorkspaceIcon
            icon={workspace.icon}
            color={workspace.color}
            variant="plain"
          />
          <span className="truncate">{workspace.name}</span>
          {selectedWorkspaceId === workspace.id && (
            <Check className="ml-auto size-4" />
          )}
        </DropdownMenuItem>
      ))}
    </div>
  );
}
