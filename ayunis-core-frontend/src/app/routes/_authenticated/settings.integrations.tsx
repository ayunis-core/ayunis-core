import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { IntegrationsSettingsPage } from '@/pages/settings/integrations-settings';

const searchSchema = z.object({
  page: z.number().min(1).optional().catch(1),
});

export const Route = createFileRoute('/_authenticated/settings/integrations')({
  validateSearch: searchSchema,
  component: RouteComponent,
});

function RouteComponent() {
  const { page = 1 } = Route.useSearch();
  return <IntegrationsSettingsPage page={page} />;
}
