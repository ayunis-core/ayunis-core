import { createFileRoute, redirect } from '@tanstack/react-router';
import OparlSystemsPage from '@/pages/super-admin-settings/oparl';
import { getFeatureToggles } from './-routines-enabled-query';

export const Route = createFileRoute(
  '/_authenticated/super-admin-settings/oparl/',
)({
  beforeLoad: async ({ context: { queryClient } }) => {
    const toggles = await getFeatureToggles(queryClient);
    if (!toggles.oparlEnabled) {
      throw redirect({ to: '/super-admin-settings/orgs' });
    }
  },
  component: OparlSystemsPage,
});
