import { createFileRoute, redirect } from '@tanstack/react-router';
import { OparlSettingsPage } from '@/pages/admin-settings/oparl-settings';
import { getFeatureToggles } from './-routines-enabled-query';

export const Route = createFileRoute('/_authenticated/admin-settings/oparl')({
  beforeLoad: async ({ context: { queryClient } }) => {
    const toggles = await getFeatureToggles(queryClient);
    if (!toggles.oparlEnabled) {
      throw redirect({ to: '/admin-settings/users' });
    }
  },
  component: OparlSettingsPage,
});
