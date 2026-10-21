import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { z } from 'zod';
import { KnowledgeBasesPage } from '@/pages/knowledge-bases';
import {
  knowledgeBasesControllerFindAll,
  getKnowledgeBasesControllerFindAllQueryKey,
} from '@/shared/api/generated/ayunisCoreAPI';
import { personalKnowledgeBaseListParams } from '@/shared/api/knowledge-base-scopes';

const searchSchema = z.object({
  tab: z.enum(['personal', 'shared', 'requests']).optional(),
});

export const Route = createFileRoute('/_authenticated/knowledge-bases/')({
  component: RouteComponent,
  validateSearch: searchSchema,
  loader: async ({ context: { queryClient } }) => {
    const knowledgeBases = await queryClient.query({
      queryKey: getKnowledgeBasesControllerFindAllQueryKey(
        personalKnowledgeBaseListParams,
      ),
      queryFn: () =>
        knowledgeBasesControllerFindAll(personalKnowledgeBaseListParams),
    });
    return { knowledgeBases };
  },
});

function RouteComponent() {
  const { knowledgeBases } = Route.useLoaderData();
  const { tab = 'personal' } = Route.useSearch();
  const navigate = useNavigate();
  return (
    <KnowledgeBasesPage
      knowledgeBases={knowledgeBases.data}
      tab={tab}
      onTabChange={(next) =>
        void navigate({
          to: '/knowledge-bases',
          search: next === 'personal' ? {} : { tab: next },
          replace: true,
        })
      }
    />
  );
}
