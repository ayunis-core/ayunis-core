import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import {
  InstallPage,
  InstallIntegrationPage,
  InstallErrorState,
} from '@/pages/install';
import AppLayout from '@/layouts/app-layout';
import FullScreenMessageLayout from '@/layouts/full-screen-message-layout/ui/FullScreenMessageLayout';
import { useTranslation } from 'react-i18next';

const searchSchema = z.object({
  skill: z.string().optional(),
  integration: z.string().optional(),
});

export const Route = createFileRoute('/_authenticated/install')({
  component: RouteComponent,
  validateSearch: searchSchema,
});

function RouteComponent() {
  const { skill, integration } = Route.useSearch();
  const { user } = Route.useRouteContext();
  const isAdmin = user?.role === 'admin';

  if (integration) {
    if (!isAdmin) {
      return <AdminRequiredMessage />;
    }
    return <InstallIntegrationPage integrationIdentifier={integration} />;
  }

  return <InstallPage skillIdentifier={skill} />;
}

function AdminRequiredMessage() {
  const { t } = useTranslation('install-integration');

  return (
    <AppLayout>
      <FullScreenMessageLayout>
        <InstallErrorState
          title={t('error.adminRequired.title')}
          description={t('error.adminRequired.description')}
          backTo="/"
          backLabel={t('action.backToIntegrations')}
        />
      </FullScreenMessageLayout>
    </AppLayout>
  );
}
