import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@ayunis/ui/components/button';
import AppLayout from '@/layouts/app-layout';
import ContentAreaLayout from '@/layouts/content-area-layout/ui/ContentAreaLayout';
import ContentAreaHeader from '@/widgets/content-area-header/ui/ContentAreaHeader';
import FullScreenMessageLayout from '@/layouts/full-screen-message-layout/ui/FullScreenMessageLayout';
import { CreateWorkspaceDialog } from '@/widgets/create-workspace-dialog';
import type { Workspace } from '@/features/workspaces';
import { PaginationWidget } from '@/widgets/pagination';
import { WorkspacesContent } from './WorkspacesContent';
import { WorkspacesEmptyState } from './WorkspacesEmptyState';

interface WorkspacesPageProps {
  workspaces: Workspace[];
  pagination: { total?: number; limit: number; offset: number };
  currentPage: number;
}

export default function WorkspacesPage({
  workspaces,
  pagination,
  currentPage,
}: Readonly<WorkspacesPageProps>) {
  const { t } = useTranslation('workspaces');
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const createButton = (
    <Button size="sm" onClick={() => setIsCreateOpen(true)}>
      {t('page.addWorkspace')}
    </Button>
  );

  const createDialog = (
    <CreateWorkspaceDialog open={isCreateOpen} onOpenChange={setIsCreateOpen} />
  );

  if (workspaces.length === 0 && currentPage === 1) {
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
            action={createButton}
          />
        }
        contentArea={
          <div className="space-y-4">
            <WorkspacesContent workspaces={workspaces} />
            <PaginationWidget
              currentPage={currentPage}
              totalPages={Math.ceil((pagination.total ?? 0) / pagination.limit)}
              to="/workspaces"
              buildSearchParams={(page) => ({ page })}
            />
          </div>
        }
      />
      {createDialog}
    </AppLayout>
  );
}
