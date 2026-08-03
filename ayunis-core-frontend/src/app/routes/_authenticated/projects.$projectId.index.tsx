import { createFileRoute } from '@tanstack/react-router';
import { ProjectOverviewRoute } from '@/pages/project';

export const Route = createFileRoute('/_authenticated/projects/$projectId/')({
  validateSearch: (search: Record<string, unknown>): { tab?: string } => ({
    tab: typeof search.tab === 'string' ? search.tab : undefined,
  }),
  component: ProjectOverviewRoute,
});
