import { createFileRoute } from '@tanstack/react-router';
import { ProjectsListPage } from '@/pages/projects';

export const Route = createFileRoute('/_authenticated/projects/')({
  component: ProjectsListPage,
});
