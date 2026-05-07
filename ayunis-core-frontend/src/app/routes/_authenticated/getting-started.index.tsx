import { createFileRoute } from '@tanstack/react-router';
import { GettingStartedPage } from '@/pages/getting-started';

export const Route = createFileRoute('/_authenticated/getting-started/')({
  component: RouteComponent,
});

function RouteComponent() {
  return <GettingStartedPage />;
}
