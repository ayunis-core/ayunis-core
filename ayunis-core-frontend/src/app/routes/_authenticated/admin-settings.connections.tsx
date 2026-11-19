import { createFileRoute, redirect } from '@tanstack/react-router';
import { ConnectionsSettingsPage } from '@/pages/admin-settings/connections-settings';
import { getFeatureToggles } from './-routines-enabled-query';

export const Route = createFileRoute(
  '/_authenticated/admin-settings/connections',
)({
  beforeLoad: async ({ context: { queryClient } }) => {
    const toggles = await getFeatureToggles(queryClient);
    if (!toggles.connectorsEnabled) {
      throw redirect({ to: '/admin-settings/users' });
    }
  },
  component: ConnectionsSettingsPage,
});
