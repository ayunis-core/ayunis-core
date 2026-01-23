import { createFileRoute } from '@tanstack/react-router';
import { PromptsPage } from '@/pages/prompts';
import {
  getPromptsControllerFindAllQueryKey,
  promptsControllerFindAll,
} from '@/shared/api/generated/ayunisCoreAPI';

export const Route = createFileRoute('/_authenticated/prompts/')({
  component: RouteComponent,
  loader: async ({ context: { queryClient } }) => {
    const prompts = await queryClient.fetchQuery({
      queryKey: getPromptsControllerFindAllQueryKey(),
      queryFn: () => promptsControllerFindAll(),
    });
    return { prompts };
  },
});

function RouteComponent() {
  const { prompts } = Route.useLoaderData();
  return <PromptsPage prompts={prompts} />;
}
