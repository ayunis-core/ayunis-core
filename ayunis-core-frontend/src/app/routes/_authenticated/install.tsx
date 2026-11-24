import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import {
  InstallPage,
  InstallIntegrationPage,
  InstallRoutinePage,
  InstallErrorState,
} from '@/pages/install';
import AppLayout from '@/layouts/app-layout';
import FullScreenMessageLayout from '@/layouts/full-screen-message-layout/ui/FullScreenMessageLayout';
import { useTranslation } from 'react-i18next';
import { createAuthorization } from '@/features/permissions';
import { MeResponseDtoRole } from '@ayunis/api-client';
import { searchParamString } from '@/shared/lib/search-params';

const searchSchema = z.object({
  skill: searchParamString.optional(),
  integration: searchParamString.optional(),
  routine: searchParamString.optional(),
});

export const Route = createFileRoute('/_authenticated/install')({
  component: RouteComponent,
  validateSearch: searchSchema,
});

function RouteComponent() {
  const { skill, integration, routine } = Route.useSearch();
  const { user } = Route.useRouteContext();
  const authorization = createAuthorization(user.role);
  const isAdmin = authorization.hasRole(MeResponseDtoRole.admin);

  if (integration) {
    if (!isAdmin) {
      return <AdminRequiredMessage />;
    }
    return <InstallIntegrationPage integrationIdentifier={integration} />;
  }

  if (routine) {
    return <InstallRoutinePage routineIdentifier={routine} />;
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
