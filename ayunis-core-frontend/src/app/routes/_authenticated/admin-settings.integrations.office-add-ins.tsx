import { createFileRoute, redirect } from '@tanstack/react-router';
import { OfficeAddinsPage } from '@/pages/admin-settings/office-add-ins';
import { getFeatureToggles } from './-routines-enabled-query';

export const Route = createFileRoute(
  '/_authenticated/admin-settings/integrations/office-add-ins',
)({
  beforeLoad: async ({ context: { queryClient } }) => {
    const toggles = await getFeatureToggles(queryClient);
    if (!toggles.outlookAddinEnabled) {
      throw redirect({ to: '/admin-settings/integrations' });
    }
  },
  component: OfficeAddinsPage,
});
