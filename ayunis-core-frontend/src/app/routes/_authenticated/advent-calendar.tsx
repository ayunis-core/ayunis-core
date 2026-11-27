import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { AdventCalendarPage } from '@/pages/advent-calendar';
import { adventCalendarQueryOptions } from '@/features/advent-calendar';

const searchSchema = z.object({
  door: z.coerce.number().int().min(1).max(24).optional().catch(undefined),
});

export const Route = createFileRoute('/_authenticated/advent-calendar')({
  validateSearch: searchSchema,
  loader: ({ context: { queryClient } }) =>
    // Doors open at midnight, so the page never shows a cached calendar.
    queryClient
      .query({ ...adventCalendarQueryOptions(), staleTime: 0 })
      .catch(() => undefined),
  component: RouteComponent,
});

function RouteComponent() {
  const { door } = Route.useSearch();
  return <AdventCalendarPage door={door} />;
}
