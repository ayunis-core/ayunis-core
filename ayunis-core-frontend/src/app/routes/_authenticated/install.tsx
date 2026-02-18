import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { InstallPage } from '@/pages/install';
import InstallIntegrationPage from '@/pages/install/ui/InstallIntegrationPage';

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

  if (integration) {
    return <InstallIntegrationPage integrationIdentifier={integration} />;
  }

  return <InstallPage skillIdentifier={skill} />;
}
