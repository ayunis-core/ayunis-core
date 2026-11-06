import { createFileRoute } from '@tanstack/react-router';
import { SkillsPage } from '@/pages/skills';
import {
  skillsControllerFindAll,
  getSkillsControllerFindAllQueryKey,
  teamsControllerListMyTeams,
  getTeamsControllerListMyTeamsQueryKey,
  myPermissionsControllerGetMine,
  getMyPermissionsControllerGetMineQueryKey,
} from '@/shared/api/generated/ayunisCoreAPI';
import { personalSkillListParams } from '@/shared/api/skill-scopes';

export const Route = createFileRoute('/_authenticated/skills/')({
  component: RouteComponent,
  loader: async ({ context: { queryClient } }) => {
    // Teams and permissions decide which team and organization skills the
    // cards may switch, pin or delete, so they are loaded before the first paint.
    const [skills] = await Promise.all([
      queryClient.query({
        queryKey: getSkillsControllerFindAllQueryKey(personalSkillListParams),
        queryFn: () => skillsControllerFindAll(personalSkillListParams),
      }),
      queryClient.query({
        queryKey: getTeamsControllerListMyTeamsQueryKey(),
        queryFn: () => teamsControllerListMyTeams(),
      }),
      queryClient.query({
        queryKey: getMyPermissionsControllerGetMineQueryKey(),
        queryFn: () => myPermissionsControllerGetMine(),
      }),
    ]);
    return { skills: skills.data };
  },
});

function RouteComponent() {
  const { skills } = Route.useLoaderData();
  return <SkillsPage skills={skills} />;
}
