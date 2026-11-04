import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import {
  PrototypeSkillsPage,
  type ListFilter,
} from '@/pages/skill-sharing-prototype';

const searchSchema = z.object({
  filter: z.string().optional().catch(undefined),
});

export const Route = createFileRoute('/_authenticated/skills/')({
  validateSearch: searchSchema,
  component: RouteComponent,
});

function RouteComponent() {
  const { filter = 'all' } = Route.useSearch();
  return (
    <PrototypeSkillsPage key={filter} initialFilter={filter as ListFilter} />
  );
}
