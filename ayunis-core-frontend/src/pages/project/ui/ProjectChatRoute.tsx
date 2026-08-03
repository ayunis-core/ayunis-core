import { Navigate, useParams, useSearch } from '@tanstack/react-router';
import { useProjects } from '@/entities/project';
import { ProjectChatPage } from './ProjectChatPage';

export function ProjectChatRoute() {
  const { projectId, chatId } = useParams({
    from: '/_authenticated/projects/$projectId/chats/$chatId',
  });
  const { artifact } = useSearch({
    from: '/_authenticated/projects/$projectId/chats/$chatId',
  });
  const projects = useProjects();
  const project = projects.find((p) => p.id === projectId);
  const chat = project?.chats.find((c) => c.id === chatId);
  if (!project || !chat) {
    return <Navigate to="/chat" />;
  }
  return (
    <ProjectChatPage
      key={chat.id}
      project={project}
      chat={chat}
      initialArtifactId={artifact}
    />
  );
}
