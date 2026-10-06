import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { PrototypeSkillsPage } from '@/pages/skill-sharing-prototype';

const searchSchema = z.object({
  tab: z.enum(['own', 'shared', 'requests']).optional().catch(undefined),
});

export const Route = createFileRoute('/_authenticated/skills/')({
  validateSearch: searchSchema,
  component: RouteComponent,
});

function RouteComponent() {
  const { tab = 'own' } = Route.useSearch();
  return <PrototypeSkillsPage key={tab} initialTab={tab} />;
}
