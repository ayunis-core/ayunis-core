import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { PrototypeKnowledgeDetailPage } from '@/pages/skill-sharing-prototype';

const searchSchema = z.object({
  tab: z.enum(['config', 'share']).optional(),
});

export const Route = createFileRoute('/_authenticated/knowledge-bases/$id')({
  validateSearch: searchSchema,
  component: RouteComponent,
});

function RouteComponent() {
  const { id } = Route.useParams();
  return <PrototypeKnowledgeDetailPage key={id} itemId={id} />;
}
