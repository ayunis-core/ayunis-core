import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { InstallPage } from '@/pages/install';

const searchSchema = z.object({
  skill: z.string().optional(),
});

export const Route = createFileRoute('/_authenticated/install')({
  component: RouteComponent,
  validateSearch: searchSchema,
});

function RouteComponent() {
  const { skill } = Route.useSearch();
  return <InstallPage skillIdentifier={skill} />;
}
