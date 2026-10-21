import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@ayunis/ui/components/button';
import AppLayout from '@/layouts/app-layout';
import ContentAreaLayout from '@/layouts/content-area-layout/ui/ContentAreaLayout';
import ContentAreaHeader from '@/widgets/content-area-header/ui/ContentAreaHeader';
import FullScreenMessageLayout from '@/layouts/full-screen-message-layout/ui/FullScreenMessageLayout';
import { CreateWorkspaceDialog } from '@/widgets/create-workspace-dialog';
import { OnboardingTourTarget, TOUR_TARGET } from '@/widgets/onboarding';
import type { Workspace } from '@/features/workspaces';
import { useMyPermissions } from '@/features/permissions';
import { PaginationWidget } from '@/widgets/pagination';
import { HelpLink } from '@/shared/ui/help-link/HelpLink';
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
  const { can, isLoading: isLoadingPermissions } = useMyPermissions();
  const canCreate = can('create_workspaces');

  const createButton = canCreate && (
    <Button
      size="sm"
      data-testid="workspaces-create"
      onClick={() => setIsCreateOpen(true)}
    >
      {t('page.addWorkspace')}
    </Button>
  );

  const spotlitCreateButton = createButton && (
    <OnboardingTourTarget name={TOUR_TARGET.createWorkspace}>
      {createButton}
    </OnboardingTourTarget>
  );

  const renderHeaderAction = (action: ReactNode) => (
    <div className="flex min-w-0 w-full flex-wrap items-center justify-end gap-2">
      <HelpLink path="workspaces/" />
      {action}
    </div>
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
              action={renderHeaderAction(createButton)}
            />
          }
        >
          <WorkspacesEmptyState
            action={spotlitCreateButton}
            canCreate={canCreate || isLoadingPermissions}
          />
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
            action={renderHeaderAction(spotlitCreateButton)}
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
