import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { PrototypeKnowledgePage } from '@/pages/skill-sharing-prototype';

const searchSchema = z.object({
  tab: z.enum(['own', 'shared', 'requests']).optional().catch(undefined),
});

export const Route = createFileRoute('/_authenticated/knowledge-bases/')({
  validateSearch: searchSchema,
  component: RouteComponent,
});

function RouteComponent() {
  const { tab = 'own' } = Route.useSearch();
  return <PrototypeKnowledgePage key={tab} initialTab={tab} />;
}
