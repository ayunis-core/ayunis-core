import { createFileRoute, redirect } from '@tanstack/react-router';
import { KnowledgeBasesPage } from '@/pages/knowledge-bases';
import {
  knowledgeBasesControllerFindAll,
  getKnowledgeBasesControllerFindAllQueryKey,
  appControllerFeatureToggles,
  getAppControllerFeatureTogglesQueryKey,
} from '@/shared/api/generated/ayunisCoreAPI';

export const Route = createFileRoute('/_authenticated/knowledge-bases/')({
  component: RouteComponent,
  loader: async ({ context: { queryClient } }) => {
    const featureToggles = await queryClient.fetchQuery({
      queryKey: getAppControllerFeatureTogglesQueryKey(),
      queryFn: () => appControllerFeatureToggles(),
    });
    if (!featureToggles.knowledgeBasesEnabled) {
      throw redirect({ to: '/chat' });
    }
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
