import { useTranslation } from 'react-i18next';
import { Check } from 'lucide-react';
import {
  DropdownMenuItem,
  DropdownMenuLabel,
} from '@ayunis/ui/components/dropdown-menu';
import { WorkspaceIcon } from '@/shared/ui/workspace-icon';
import { useFavorites } from '@/features/favorites';
import type { Workspace } from '@/features/workspaces';
import { groupFavoriteWorkspaces } from '@/widgets/workspace-picker-menu/lib/groupFavoriteWorkspaces';

interface WorkspacePickerMenuProps {
  workspaces: Workspace[];
  selectedWorkspaceId?: string | null;
  onSelect: (workspace: Workspace) => void;
}

function WorkspaceItems({
  workspaces,
  selectedWorkspaceId,
  onSelect,
}: Readonly<WorkspacePickerMenuProps>) {
  return workspaces.map((workspace) => (
    <DropdownMenuItem key={workspace.id} onClick={() => onSelect(workspace)}>
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
  ));
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
  const { favorites } = useFavorites();

  if (workspaces.length === 0) {
    return (
      <div className="px-2 py-1.5 text-sm text-muted-foreground">
        {t('picker.empty')}
      </div>
    );
  }

  const groups = groupFavoriteWorkspaces(workspaces, favorites);
  const hasFavorites = groups.favorites.length > 0;

  return (
    <div className="max-h-72 overflow-y-auto">
      {hasFavorites && (
        <>
          <DropdownMenuLabel>{t('picker.favorites')}</DropdownMenuLabel>
          <WorkspaceItems
            workspaces={groups.favorites}
            selectedWorkspaceId={selectedWorkspaceId}
            onSelect={onSelect}
          />
        </>
      )}
      {hasFavorites && groups.others.length > 0 && (
        <DropdownMenuLabel>{t('picker.otherWorkspaces')}</DropdownMenuLabel>
      )}
      <WorkspaceItems
        workspaces={groups.others}
        selectedWorkspaceId={selectedWorkspaceId}
        onSelect={onSelect}
      />
    </div>
  );
}
