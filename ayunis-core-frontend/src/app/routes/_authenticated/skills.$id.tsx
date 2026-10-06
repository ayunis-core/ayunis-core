import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { PrototypeSkillPage } from '@/pages/skill-sharing-prototype';

const searchSchema = z.object({
  tab: z.enum(['config', 'share']).optional(),
});

export const Route = createFileRoute('/_authenticated/skills/$id')({
  component: RouteComponent,
  validateSearch: searchSchema,
});

function RouteComponent() {
  const { id } = Route.useParams();
  return <PrototypeSkillPage key={id} skillId={id} />;
}
