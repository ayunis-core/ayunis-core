import { createFileRoute } from '@tanstack/react-router';
import { ArtifactPage } from '@/pages/artifact';
import { loadChatStarterDefaults } from './-chat-starter-defaults-query';

export const Route = createFileRoute('/_authenticated/artifacts/$artifactId')({
  component: RouteComponent,
  loader: async ({ context: { queryClient } }) => ({
    chatStarter: await loadChatStarterDefaults(queryClient),
  }),
});

function RouteComponent() {
  const { artifactId } = Route.useParams();
  const { chatStarter } = Route.useLoaderData();
  return (
    <ArtifactPage
      key={artifactId}
      artifactId={artifactId}
      chatStarter={chatStarter}
    />
  );
}
