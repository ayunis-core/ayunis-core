import { createFileRoute } from '@tanstack/react-router';
import { ProjectChatRoute } from '@/pages/project';

export const Route = createFileRoute(
  '/_authenticated/projects/$projectId/chats/$chatId',
)({
  validateSearch: (search: Record<string, unknown>): { artifact?: string } => ({
    artifact: typeof search.artifact === 'string' ? search.artifact : undefined,
  }),
  component: ProjectChatRoute,
});
