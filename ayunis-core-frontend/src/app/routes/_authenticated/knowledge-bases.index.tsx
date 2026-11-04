import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import {
  PrototypeKnowledgePage,
  type ListFilter,
} from '@/pages/skill-sharing-prototype';

const searchSchema = z.object({
  filter: z.string().optional().catch(undefined),
});

export const Route = createFileRoute('/_authenticated/knowledge-bases/')({
  validateSearch: searchSchema,
  component: RouteComponent,
});

function RouteComponent() {
  const { filter = 'all' } = Route.useSearch();
  return (
    <PrototypeKnowledgePage key={filter} initialFilter={filter as ListFilter} />
  );
}
