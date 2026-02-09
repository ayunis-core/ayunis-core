import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { InstallPage } from '@/pages/install';

const searchSchema = z.object({
  agent: z.string().optional(),
});

export const Route = createFileRoute('/_authenticated/install')({
  component: RouteComponent,
  validateSearch: searchSchema,
});

function RouteComponent() {
  const { agent } = Route.useSearch();
  return <InstallPage agentIdentifier={agent} />;
}
