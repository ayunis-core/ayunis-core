import { createFileRoute } from '@tanstack/react-router';
import { IntegrationsSettingsPage } from '@/pages/settings/integrations-settings';

export const Route = createFileRoute('/_authenticated/settings/integrations')({
  component: RouteComponent,
});

function RouteComponent() {
  return <IntegrationsSettingsPage />;
}
