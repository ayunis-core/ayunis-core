import { createFileRoute } from '@tanstack/react-router';
import SkillTemplatesPage from '@/pages/super-admin-settings/skill-templates';
import {
  getSuperAdminSkillTemplatesControllerFindAllQueryKey,
  superAdminSkillTemplatesControllerFindAll,
} from '@/shared/api';

export const Route = createFileRoute(
  '/_authenticated/super-admin-settings/skills/',
)({
  component: RouteComponent,
  loader: async ({ context: { queryClient } }) => {
    return {
      skillTemplates: await queryClient.fetchQuery({
        queryKey: getSuperAdminSkillTemplatesControllerFindAllQueryKey(),
        queryFn: () => superAdminSkillTemplatesControllerFindAll(),
      }),
    };
  },
});

function RouteComponent() {
  const { skillTemplates } = Route.useLoaderData();
  return <SkillTemplatesPage skillTemplates={skillTemplates} />;
}
