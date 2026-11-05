import { createFileRoute } from '@tanstack/react-router';
import { MemorySettingsPage } from '@/pages/settings/memory-settings';

export const Route = createFileRoute('/_authenticated/settings/memory')({
  component: RouteComponent,
});

function RouteComponent() {
  return <MemorySettingsPage />;
}
