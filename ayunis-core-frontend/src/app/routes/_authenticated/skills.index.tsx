import { createFileRoute, redirect } from '@tanstack/react-router';
import { SkillsPage } from '@/pages/skills';
import {
  skillsControllerFindAll,
  getSkillsControllerFindAllQueryKey,
  appControllerFeatureToggles,
  getAppControllerFeatureTogglesQueryKey,
} from '@/shared/api/generated/ayunisCoreAPI';
import { personalSkillListParams } from '@/shared/api/skill-scopes';

export const Route = createFileRoute('/_authenticated/skills/')({
  component: RouteComponent,
  loader: async ({ context: { queryClient } }) => {
    const featureToggles = await queryClient.fetchQuery({
      queryKey: getAppControllerFeatureTogglesQueryKey(),
      queryFn: () => appControllerFeatureToggles(),
    });
    if (!featureToggles.skillsEnabled) {
      throw redirect({ to: '/chat' });
    }
    const skills = await queryClient.fetchQuery({
      queryKey: getSkillsControllerFindAllQueryKey(personalSkillListParams),
      queryFn: () => skillsControllerFindAll(personalSkillListParams),
    });
    return { skills: skills.data };
  },
});

function RouteComponent() {
  const { skills } = Route.useLoaderData();
  return <SkillsPage skills={skills} />;
}
