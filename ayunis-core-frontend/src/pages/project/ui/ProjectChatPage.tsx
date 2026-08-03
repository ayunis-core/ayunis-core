import { useNavigate } from '@tanstack/react-router';
import AppLayout from '@/layouts/app-layout';
import { ChatView } from './ChatView';
import type { MockProject, ProjectChat } from '@/entities/project';

interface ProjectChatPageProps {
  project: MockProject;
  chat: ProjectChat;
  initialArtifactId?: string;
}

export function ProjectChatPage({
  project,
  chat,
  initialArtifactId,
}: Readonly<ProjectChatPageProps>) {
  const navigate = useNavigate();
  return (
    <AppLayout>
      <ChatView
        project={project}
        chat={chat}
        initialArtifactId={initialArtifactId}
        onBackToProject={() =>
          void navigate({
            to: '/projects/$projectId',
            params: { projectId: project.id },
          })
        }
      />
    </AppLayout>
  );
}
