import { createFileRoute, redirect } from '@tanstack/react-router';
import { Microsoft365ConnectorPage } from '@/pages/admin-settings/microsoft-365-connector';
import { getFeatureToggles } from './-routines-enabled-query';

export const Route = createFileRoute(
  '/_authenticated/admin-settings/connections/microsoft-365',
)({
  beforeLoad: async ({ context: { queryClient } }) => {
    const toggles = await getFeatureToggles(queryClient);
    if (!toggles.connectorsEnabled) {
      throw redirect({ to: '/admin-settings/users' });
    }
  },
  component: Microsoft365ConnectorPage,
});
