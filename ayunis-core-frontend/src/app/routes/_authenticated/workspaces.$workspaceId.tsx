import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { PrototypeWorkspacePage } from '@/pages/skill-sharing-prototype';

const searchSchema = z.object({
  search: z.string().optional(),
  page: z.number().min(1).optional().catch(1),
  tab: z
    .enum(['chats', 'artifacts', 'skills', 'knowledge', 'instructions'])
    .optional()
    .catch('chats'),
  dialog: z.enum(['add', 'members', 'transfer']).optional().catch(undefined),
});

export const Route = createFileRoute('/_authenticated/workspaces/$workspaceId')(
  {
    validateSearch: searchSchema,
    component: RouteComponent,
  },
);

function RouteComponent() {
  const { workspaceId } = Route.useParams();
  const { tab = 'chats', dialog } = Route.useSearch();
  return (
    <PrototypeWorkspacePage
      workspaceId={workspaceId}
      tab={tab}
      dialog={dialog}
    />
  );
}
