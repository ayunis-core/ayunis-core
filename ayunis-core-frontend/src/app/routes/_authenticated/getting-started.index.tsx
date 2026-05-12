import { createFileRoute, Navigate } from '@tanstack/react-router';
import { GettingStartedPage } from '@/pages/getting-started';
import { isGettingStartedHidden } from '@/shared/lib/getting-started-storage';

export const Route = createFileRoute('/_authenticated/getting-started/')({
  component: RouteComponent,
});

function RouteComponent() {
  if (isGettingStartedHidden()) {
    return <Navigate to="/chat" />;
  }
  return <GettingStartedPage />;
}
