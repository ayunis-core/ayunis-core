import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { z } from 'zod';
import { SkillsPage } from '@/pages/skills';
import {
  skillsControllerFindAll,
  getSkillsControllerFindAllQueryKey,
} from '@/shared/api/generated/ayunisCoreAPI';
import { personalSkillListParams } from '@/shared/api/skill-scopes';

const searchSchema = z.object({
  tab: z.enum(['own', 'shared', 'requests']).optional().catch(undefined),
});

export const Route = createFileRoute('/_authenticated/skills/')({
  component: RouteComponent,
  validateSearch: searchSchema,
  loader: async ({ context: { queryClient } }) => {
    const skills = await queryClient.query({
      queryKey: getSkillsControllerFindAllQueryKey(personalSkillListParams),
      queryFn: () => skillsControllerFindAll(personalSkillListParams),
    });
    return { skills: skills.data };
  },
});

function RouteComponent() {
  const { skills } = Route.useLoaderData();
  const { tab = 'own' } = Route.useSearch();
  const navigate = useNavigate();
  return (
    <SkillsPage
      skills={skills}
      tab={tab}
      onTabChange={(next) =>
        void navigate({
          to: '/skills',
          search: next === 'own' ? {} : { tab: next },
          replace: true,
        })
      }
    />
  );
}
