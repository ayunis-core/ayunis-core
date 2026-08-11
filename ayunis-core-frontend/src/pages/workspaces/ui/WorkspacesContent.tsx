import { useTranslation } from 'react-i18next';
import type { Workspace } from '@/features/workspaces';
import type { WorkspacesViewMode } from './useWorkspacesViewMode';
import { WorkspaceCard } from './WorkspaceCard';
import { WorkspaceRow } from './WorkspaceRow';

interface WorkspacesContentProps {
  workspaces: Workspace[];
  viewMode: WorkspacesViewMode;
}

export function WorkspacesContent({
  workspaces,
  viewMode,
}: Readonly<WorkspacesContentProps>) {
  const { t } = useTranslation('workspaces');

  if (workspaces.length === 0) {
    return <p className="text-muted-foreground">{t('page.noResults')}</p>;
  }

  if (viewMode === 'grid') {
    return (
      <div className="grid gap-3 sm:grid-cols-2">
        {workspaces.map((workspace) => (
          <WorkspaceCard key={workspace.id} workspace={workspace} />
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {workspaces.map((workspace) => (
        <WorkspaceRow key={workspace.id} workspace={workspace} />
      ))}
    </div>
  );
}
