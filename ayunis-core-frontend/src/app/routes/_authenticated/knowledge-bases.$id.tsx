import { queryOptions } from '@tanstack/react-query';
import {
  knowledgeBasesControllerFindOne,
  getKnowledgeBasesControllerFindOneQueryKey,
  appControllerFeatureToggles,
  getAppControllerFeatureTogglesQueryKey,
} from '@/shared/api/generated/ayunisCoreAPI';
import { createFileRoute, redirect } from '@tanstack/react-router';
import { KnowledgeBasePage } from '@/pages/knowledge-base';

const knowledgeBaseQueryOptions = (id: string) =>
  queryOptions({
    queryKey: getKnowledgeBasesControllerFindOneQueryKey(id),
    queryFn: () => knowledgeBasesControllerFindOne(id),
  });

export const Route = createFileRoute('/_authenticated/knowledge-bases/$id')({
  component: RouteComponent,
  loader: async ({ context: { queryClient }, params: { id } }) => {
    const featureToggles = await queryClient.fetchQuery({
      queryKey: getAppControllerFeatureTogglesQueryKey(),
      queryFn: () => appControllerFeatureToggles(),
    });
    if (!featureToggles.knowledgeBasesEnabled) {
      throw redirect({ to: '/chat' });
    }
    const knowledgeBase = await queryClient.fetchQuery(
      knowledgeBaseQueryOptions(id),
    );
    return { knowledgeBase };
  },
});

function RouteComponent() {
  const { knowledgeBase } = Route.useLoaderData();
  return <KnowledgeBasePage knowledgeBase={knowledgeBase} />;
}
