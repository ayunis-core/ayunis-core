import { queryOptions } from '@tanstack/react-query';
import {
  skillsControllerFindOne,
  getSkillsControllerFindOneQueryKey,
  getModelsControllerIsEmbeddingModelEnabledQueryKey,
  modelsControllerIsEmbeddingModelEnabled,
} from '@/shared/api/generated/ayunisCoreAPI';
import { createFileRoute } from '@tanstack/react-router';
import { SkillPage } from '@/pages/skill';

const skillQueryOptions = (id: string) =>
  queryOptions({
    queryKey: getSkillsControllerFindOneQueryKey(id),
    queryFn: () => skillsControllerFindOne(id),
  });

const queryIsEmbeddingModelEnabledOptions = () => ({
  queryKey: getModelsControllerIsEmbeddingModelEnabledQueryKey(),
  queryFn: () => modelsControllerIsEmbeddingModelEnabled(),
});

export const Route = createFileRoute('/_authenticated/skills/$id')({
  component: RouteComponent,
  loader: async ({ context: { queryClient }, params: { id } }) => {
    const skill = await queryClient.query(skillQueryOptions(id));
    const isEmbeddingModelEnabled = await queryClient.query(
      queryIsEmbeddingModelEnabledOptions(),
    );
    return { skill, isEmbeddingModelEnabled };
  },
});

function RouteComponent() {
  const { skill, isEmbeddingModelEnabled } = Route.useLoaderData();
  return (
    <SkillPage
      skill={skill}
      isEmbeddingModelEnabled={isEmbeddingModelEnabled.isEmbeddingModelEnabled}
    />
  );
}
