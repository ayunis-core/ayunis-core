import { queryOptions } from '@tanstack/react-query';
import {
  skillsControllerFindOne,
  getSkillsControllerFindOneQueryKey,
  getModelsControllerIsEmbeddingModelEnabledQueryKey,
  modelsControllerIsEmbeddingModelEnabled,
  teamsControllerListMyTeams,
  getTeamsControllerListMyTeamsQueryKey,
  myPermissionsControllerGetMine,
  getMyPermissionsControllerGetMineQueryKey,
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

const userTeamsQueryOptions = () =>
  queryOptions({
    queryKey: getTeamsControllerListMyTeamsQueryKey(),
    queryFn: () => teamsControllerListMyTeams(),
  });

const myPermissionsQueryOptions = () =>
  queryOptions({
    queryKey: getMyPermissionsControllerGetMineQueryKey(),
    queryFn: () => myPermissionsControllerGetMine(),
  });

export const Route = createFileRoute('/_authenticated/skills/$id')({
  component: RouteComponent,
  loader: async ({ context: { queryClient }, params: { id } }) => {
    const skill = await queryClient.query(skillQueryOptions(id));
    const isEmbeddingModelEnabled = await queryClient.query(
      queryIsEmbeddingModelEnabledOptions(),
    );
    // Teams and permissions decide who may manage team and organization
    // items, so they are loaded before the first paint for every owner.
    await Promise.all([
      queryClient.query(userTeamsQueryOptions()),
      queryClient.query(myPermissionsQueryOptions()),
    ]);
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
