import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { LetterheadsSettingsPage } from '@/pages/admin-settings/letterheads-settings';

const searchSchema = z.object({
  page: z.number().int().min(1).optional().catch(1),
  letterhead: z.uuid().optional().catch(undefined),
});

export const Route = createFileRoute(
  '/_authenticated/admin-settings/letterheads/',
)({
  validateSearch: searchSchema,
  component: RouteComponent,
});

function RouteComponent() {
  const { page = 1, letterhead } = Route.useSearch();
  return (
    <LetterheadsSettingsPage page={page} createdLetterheadId={letterhead} />
  );
}
