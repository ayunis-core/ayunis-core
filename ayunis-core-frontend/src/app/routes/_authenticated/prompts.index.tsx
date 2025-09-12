import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useQuery } from "@tanstack/react-query";
import { PromptsPage } from "@/pages/prompts";
import {
  getPromptsControllerFindAllQueryKey,
  promptsControllerFindAll,
} from "@/shared/api/generated/ayunisCoreAPI";

const promptQueryOptions = () =>
  queryOptions({
    queryKey: getPromptsControllerFindAllQueryKey(),
    queryFn: () => promptsControllerFindAll(),
  });

export const Route = createFileRoute("/_authenticated/prompts/")({
  component: RouteComponent,
  loader: async ({ context: { queryClient } }) => {
    const prompts = await queryClient.fetchQuery(promptQueryOptions());
    return prompts;
  },
});

function RouteComponent() {
  const { data: prompts } = useQuery(promptQueryOptions());
  return <PromptsPage prompts={prompts || []} />;
}
