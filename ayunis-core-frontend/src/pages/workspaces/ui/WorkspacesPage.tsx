import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@ayunis/ui/components/button';
import AppLayout from '@/layouts/app-layout';
import ContentAreaLayout from '@/layouts/content-area-layout/ui/ContentAreaLayout';
import ContentAreaHeader from '@/widgets/content-area-header/ui/ContentAreaHeader';
import FullScreenMessageLayout from '@/layouts/full-screen-message-layout/ui/FullScreenMessageLayout';
import { CreateWorkspaceDialog } from '@/widgets/create-workspace-dialog';
import type { Workspace } from '@/features/workspaces';
import {
  filterWorkspaces,
  sortWorkspaces,
  type WorkspaceSortKey,
} from '../lib/sortWorkspaces';
import { WorkspacesContent } from './WorkspacesContent';
import { WorkspacesEmptyState } from './WorkspacesEmptyState';
import { WorkspacesToolbar } from './WorkspacesToolbar';

interface WorkspacesPageProps {
  workspaces: Workspace[];
}

export default function WorkspacesPage({
  workspaces,
}: Readonly<WorkspacesPageProps>) {
  const { t, i18n } = useTranslation('workspaces');
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<WorkspaceSortKey>('updatedAt');
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const visible = sortWorkspaces(
    filterWorkspaces(workspaces, search),
    sortKey,
    i18n.language,
  );

  const createButton = (
    <Button onClick={() => setIsCreateOpen(true)}>
      {t('page.newWorkspace')}
    </Button>
  );

  const createDialog = (
    <CreateWorkspaceDialog open={isCreateOpen} onOpenChange={setIsCreateOpen} />
  );

  if (workspaces.length === 0) {
    return (
      <AppLayout>
        <FullScreenMessageLayout
          header={
            <ContentAreaHeader
              breadcrumbs={[{ label: t('page.title') }]}
              action={createButton}
            />
          }
        >
          <WorkspacesEmptyState action={createButton} />
        </FullScreenMessageLayout>
        {createDialog}
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <ContentAreaLayout
        contentHeader={
          <ContentAreaHeader
            breadcrumbs={[{ label: t('page.title') }]}
            action={
              <WorkspacesToolbar
                search={search}
                onSearchChange={setSearch}
                sortKey={sortKey}
                onSortKeyChange={setSortKey}
                createButton={createButton}
              />
            }
          />
        }
        contentArea={
          <div className="space-y-4">
            <h1 className="text-2xl font-semibold">{t('page.heading')}</h1>
            <WorkspacesContent workspaces={visible} />
          </div>
        }
      />
      {createDialog}
    </AppLayout>
  );
}
