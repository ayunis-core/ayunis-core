import { createFileRoute } from '@tanstack/react-router';
import { SkillsPage } from '@/pages/skills';
import {
  skillsControllerFindAll,
  getSkillsControllerFindAllQueryKey,
} from '@/shared/api/generated/ayunisCoreAPI';

export const Route = createFileRoute('/_authenticated/skills/')({
  component: RouteComponent,
  loader: async ({ context: { queryClient } }) => {
    const skills = await queryClient.fetchQuery({
      queryKey: getSkillsControllerFindAllQueryKey(),
      queryFn: () => skillsControllerFindAll(),
    });
    return { skills };
  },
});

function RouteComponent() {
  const { skills } = Route.useLoaderData();
  return <SkillsPage skills={skills} />;
}
