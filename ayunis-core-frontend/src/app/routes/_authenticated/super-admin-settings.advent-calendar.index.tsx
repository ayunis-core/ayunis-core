import { createFileRoute } from '@tanstack/react-router';
import AdventCalendarPage from '@/pages/super-admin-settings/advent-calendar';

export const Route = createFileRoute(
  '/_authenticated/super-admin-settings/advent-calendar/',
)({
  component: RouteComponent,
});

function RouteComponent() {
  return <AdventCalendarPage />;
}
