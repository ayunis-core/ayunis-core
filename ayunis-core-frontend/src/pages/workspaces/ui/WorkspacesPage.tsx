import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { Button } from '@ayunis/ui/components/button';
import AppLayout from '@/layouts/app-layout';
import ContentAreaLayout from '@/layouts/content-area-layout/ui/ContentAreaLayout';
import ContentAreaHeader from '@/widgets/content-area-header/ui/ContentAreaHeader';
import FullScreenMessageLayout from '@/layouts/full-screen-message-layout/ui/FullScreenMessageLayout';
import { CreateWorkspaceDialog } from '@/widgets/create-workspace-dialog';
import type { Workspace } from '@/features/workspaces';
import { useWorkspaceInvitationsControllerList } from '@/shared/api/generated/ayunisCoreAPI';
import type { WorkspaceSortKey } from '@/pages/workspaces/lib/sortWorkspaces';
import { SearchPagination } from '@/widgets/pagination';
import { WorkspacesContent } from './WorkspacesContent';
import { WorkspacesEmptyState } from './WorkspacesEmptyState';
import { WorkspacesToolbar } from './WorkspacesToolbar';
import { WorkspaceInvitations } from './WorkspaceInvitations';

interface WorkspacesPageProps {
  workspaces: Workspace[];
  pagination: { total?: number; limit: number; offset: number };
  search?: string;
  currentPage: number;
  sortKey: WorkspaceSortKey;
}

export default function WorkspacesPage({
  workspaces,
  pagination,
  search,
  currentPage,
  sortKey,
}: Readonly<WorkspacesPageProps>) {
  const { t } = useTranslation('workspaces');
  const navigate = useNavigate();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const {
    data: invitations = [],
    isLoading: areInvitationsLoading,
    isError: invitationsFailed,
  } = useWorkspaceInvitationsControllerList();

  const updateSearch = (value: string) => {
    void navigate({
      to: '/workspaces',
      search: (previous) => ({
        ...previous,
        search: value || undefined,
        page: undefined,
      }),
    });
  };

  const updateSort = (value: WorkspaceSortKey) => {
    void navigate({
      to: '/workspaces',
      search: (previous) => ({ ...previous, sort: value, page: undefined }),
    });
  };

  const createButton = (
    <Button onClick={() => setIsCreateOpen(true)}>
      {t('page.newWorkspace')}
    </Button>
  );

  const createDialog = (
    <CreateWorkspaceDialog open={isCreateOpen} onOpenChange={setIsCreateOpen} />
  );

  if (
    workspaces.length === 0 &&
    invitations.length === 0 &&
    !areInvitationsLoading &&
    !invitationsFailed &&
    !search &&
    currentPage === 1
  ) {
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
                key={search ?? ''}
                search={search ?? ''}
                onSearchChange={updateSearch}
                sortKey={sortKey}
                onSortKeyChange={updateSort}
                createButton={createButton}
              />
            }
          />
        }
        contentArea={
          <div className="space-y-4">
            <h1 className="text-2xl font-semibold">{t('page.heading')}</h1>
            <WorkspaceInvitations />
            <WorkspacesContent workspaces={workspaces} />
            <SearchPagination
              currentPage={currentPage}
              totalPages={Math.ceil((pagination.total ?? 0) / pagination.limit)}
              to="/workspaces"
              search={search}
              extraSearchParams={{ sort: sortKey }}
            />
          </div>
        }
      />
      {createDialog}
    </AppLayout>
  );
}
