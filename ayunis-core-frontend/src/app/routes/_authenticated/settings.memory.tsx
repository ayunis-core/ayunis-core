import { createFileRoute, redirect } from '@tanstack/react-router';
import { MemorySettingsPage } from '@/pages/settings/memory-settings';
import { memoryEnabledQueryOptions } from '@/features/memory-enabled';

export const Route = createFileRoute('/_authenticated/settings/memory')({
  // A bookmark from before an admin turned memory off should land somewhere
  // useful rather than on an empty page.
  beforeLoad: async ({ context: { queryClient } }) => {
    const defaults = await queryClient.query(memoryEnabledQueryOptions());
    if (!defaults.memoryEnabled) {
      throw redirect({ to: '/settings/general' });
    }
  },
  component: RouteComponent,
});

function RouteComponent() {
  return <MemorySettingsPage />;
}
