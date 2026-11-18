import { createFileRoute, redirect } from '@tanstack/react-router';
import { MemorySettingsPage } from '@/pages/settings/memory-settings';
import { getFeatureToggles } from './-routines-enabled-query';

export const Route = createFileRoute('/_authenticated/settings/memory')({
  beforeLoad: async ({ context: { queryClient } }) => {
    const toggles = await getFeatureToggles(queryClient);
    if (!toggles.memoryEnabled) {
      throw redirect({ to: '/settings/general' });
    }
  },
  component: RouteComponent,
});

function RouteComponent() {
  return <MemorySettingsPage />;
}
