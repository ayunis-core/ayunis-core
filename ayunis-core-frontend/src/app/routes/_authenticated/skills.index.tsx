import { createFileRoute } from '@tanstack/react-router';
import { SkillsPage } from '@/pages/skills';
import {
  skillsControllerFindAll,
  getSkillsControllerFindAllQueryKey,
  teamsControllerListMyTeams,
  getTeamsControllerListMyTeamsQueryKey,
  myPermissionsControllerGetMine,
  getMyPermissionsControllerGetMineQueryKey,
} from '@ayunis/api-client/endpoints';
import { personalSkillListParams } from '@/shared/api/skill-scopes';
import { loadChatStarterDefaults } from '@/widgets/chat-starter';

export const Route = createFileRoute('/_authenticated/skills/')({
  component: RouteComponent,
  loader: async ({ context: { queryClient } }) => {
    // Teams and permissions decide which team and organization skills the
    // cards may switch, pin or delete, so they are loaded before the first paint.
    const [skills, chatStarter] = await Promise.all([
      queryClient.query({
        queryKey: getSkillsControllerFindAllQueryKey(personalSkillListParams),
        queryFn: () => skillsControllerFindAll(personalSkillListParams),
      }),
      loadChatStarterDefaults(queryClient),
      queryClient.query({
        queryKey: getTeamsControllerListMyTeamsQueryKey(),
        queryFn: () => teamsControllerListMyTeams(),
      }),
      queryClient.query({
        queryKey: getMyPermissionsControllerGetMineQueryKey(),
        queryFn: () => myPermissionsControllerGetMine(),
      }),
    ]);
    return { skills: skills.data, chatStarter };
  },
});

function RouteComponent() {
  const { skills, chatStarter } = Route.useLoaderData();
  return <SkillsPage skills={skills} chatStarter={chatStarter} />;
}
