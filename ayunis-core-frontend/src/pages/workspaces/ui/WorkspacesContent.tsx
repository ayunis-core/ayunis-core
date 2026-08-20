import { useTranslation } from 'react-i18next';
import type { Workspace } from '@/features/workspaces';
import { WorkspaceRow } from './WorkspaceRow';

interface WorkspacesContentProps {
  workspaces: Workspace[];
}

function WorkspaceGroup({
  title,
  workspaces,
}: Readonly<{ title: string; workspaces: Workspace[] }>) {
  if (workspaces.length === 0) return null;
  return (
    <section className="space-y-2">
      <h2 className="text-lg font-semibold">{title}</h2>
      <div className="flex flex-col gap-2">
        {workspaces.map((workspace) => (
          <WorkspaceRow key={workspace.id} workspace={workspace} />
        ))}
      </div>
    </section>
  );
}

export function WorkspacesContent({
  workspaces,
}: Readonly<WorkspacesContentProps>) {
  const { t } = useTranslation('workspaces');

  if (workspaces.length === 0) {
    return <p className="text-muted-foreground">{t('page.noResults')}</p>;
  }

  const owned = workspaces.filter(({ isOwner }) => isOwner);
  const shared = workspaces.filter(({ isOwner }) => !isOwner);

  return (
    <div className="space-y-6">
      <WorkspaceGroup title={t('page.owned')} workspaces={owned} />
      <WorkspaceGroup title={t('page.shared')} workspaces={shared} />
    </div>
  );
}
