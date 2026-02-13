import { createFileRoute } from '@tanstack/react-router';
import { ChatSettingsPage } from '@/pages/settings/chat-settings';

export const Route = createFileRoute('/_authenticated/settings/chat')({
  component: RouteComponent,
});

function RouteComponent() {
  return <ChatSettingsPage />;
}
