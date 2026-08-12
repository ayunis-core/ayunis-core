import { useTranslation } from 'react-i18next';
import type { Workspace } from '@/features/workspaces';
import { WorkspaceRow } from './WorkspaceRow';

interface WorkspacesContentProps {
  workspaces: Workspace[];
}

export function WorkspacesContent({
  workspaces,
}: Readonly<WorkspacesContentProps>) {
  const { t } = useTranslation('workspaces');

  if (workspaces.length === 0) {
    return <p className="text-muted-foreground">{t('page.noResults')}</p>;
  }

  return (
    <div className="flex flex-col gap-2">
      {workspaces.map((workspace) => (
        <WorkspaceRow key={workspace.id} workspace={workspace} />
      ))}
    </div>
  );
}
