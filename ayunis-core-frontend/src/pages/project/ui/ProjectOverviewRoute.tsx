import { Navigate, useParams, useSearch } from '@tanstack/react-router';
import { useProjects } from '@/entities/project';
import { ProjectOverviewPage } from './ProjectOverviewPage';

export function ProjectOverviewRoute() {
  const { projectId } = useParams({
    from: '/_authenticated/projects/$projectId/',
  });
  const { tab } = useSearch({
    from: '/_authenticated/projects/$projectId/',
  });
  const projects = useProjects();
  const project = projects.find((p) => p.id === projectId);
  if (!project) {
    return <Navigate to="/chat" />;
  }
  return <ProjectOverviewPage project={project} initialTab={tab} />;
}
