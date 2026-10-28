import { queryOptions } from '@tanstack/react-query';
import {
  skillsControllerFindOne,
  getSkillsControllerFindOneQueryKey,
  getModelsControllerIsEmbeddingModelEnabledQueryKey,
  modelsControllerIsEmbeddingModelEnabled,
  sharesControllerGetShares,
  getSharesControllerGetSharesQueryKey,
  teamsControllerListMyTeams,
  getTeamsControllerListMyTeamsQueryKey,
} from '@/shared/api/generated/ayunisCoreAPI';
import { CreateSkillShareDtoEntityType } from '@/shared/api/generated/ayunisCoreAPI.schemas';
import { createFileRoute } from '@tanstack/react-router';
import { SkillPage } from '@/pages/skill';
import { z } from 'zod';

const searchSchema = z.object({
  tab: z.enum(['config', 'share']).optional(),
});

const skillQueryOptions = (id: string) =>
  queryOptions({
    queryKey: getSkillsControllerFindOneQueryKey(id),
    queryFn: () => skillsControllerFindOne(id),
  });

const queryIsEmbeddingModelEnabledOptions = () => ({
  queryKey: getModelsControllerIsEmbeddingModelEnabledQueryKey(),
  queryFn: () => modelsControllerIsEmbeddingModelEnabled(),
});

const sharesQueryOptions = (skillId: string) =>
  queryOptions({
    queryKey: getSharesControllerGetSharesQueryKey({
      entityId: skillId,
      entityType: CreateSkillShareDtoEntityType.skill,
    }),
    queryFn: () =>
      sharesControllerGetShares({
        entityId: skillId,
        entityType: CreateSkillShareDtoEntityType.skill,
      }),
  });

const userTeamsQueryOptions = () =>
  queryOptions({
    queryKey: getTeamsControllerListMyTeamsQueryKey(),
    queryFn: () => teamsControllerListMyTeams(),
  });

export const Route = createFileRoute('/_authenticated/skills/$id')({
  component: RouteComponent,
  validateSearch: searchSchema,
  loader: async ({ context: { queryClient }, params: { id } }) => {
    const skill = await queryClient.query(skillQueryOptions(id));
    const isEmbeddingModelEnabled = await queryClient.query(
      queryIsEmbeddingModelEnabledOptions(),
    );
    // Only query shares and user teams if the user owns the skill (not shared)
    const shares = skill.isShared
      ? []
      : await queryClient.query(sharesQueryOptions(id));
    const userTeams = skill.isShared
      ? []
      : await queryClient.query(userTeamsQueryOptions());
    return { skill, isEmbeddingModelEnabled, shares, userTeams };
  },
});

function RouteComponent() {
  const { skill, isEmbeddingModelEnabled, shares, userTeams } =
    Route.useLoaderData();
  const { tab } = Route.useSearch();
  return (
    <SkillPage
      skill={skill}
      shares={shares}
      userTeams={userTeams}
      isEmbeddingModelEnabled={isEmbeddingModelEnabled.isEmbeddingModelEnabled}
      initialTab={tab}
    />
  );
}
