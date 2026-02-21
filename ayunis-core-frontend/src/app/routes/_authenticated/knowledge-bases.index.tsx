import { createFileRoute } from '@tanstack/react-router';
import { KnowledgeBasesPage } from '@/pages/knowledge-bases';
import {
  knowledgeBasesControllerFindAll,
  getKnowledgeBasesControllerFindAllQueryKey,
} from '@/shared/api/generated/ayunisCoreAPI';

export const Route = createFileRoute('/_authenticated/knowledge-bases/')({
  component: RouteComponent,
  loader: async ({ context: { queryClient } }) => {
    const knowledgeBases = await queryClient.fetchQuery({
      queryKey: getKnowledgeBasesControllerFindAllQueryKey(),
      queryFn: () => knowledgeBasesControllerFindAll(),
    });
    return { knowledgeBases };
  },
});

function RouteComponent() {
  const { knowledgeBases } = Route.useLoaderData();
  return <KnowledgeBasesPage knowledgeBases={knowledgeBases.data} />;
}
