import { createFileRoute, redirect } from '@tanstack/react-router';
import { z } from 'zod';
import { RoutinePage, ROUTINE_TABS } from '@/pages/routine';
import {
  getRoutinesControllerFindOneQueryKey,
  routinesControllerFindOne,
} from '@/shared/api/generated/ayunisCoreAPI';
import { canManageRoutines } from './-manage-routines-access';

const searchSchema = z.object({
  tab: z.enum(ROUTINE_TABS).optional().catch(undefined),
  page: z.number().min(1).optional().catch(1),
});

export const Route = createFileRoute('/_authenticated/routines/$routineId')({
  validateSearch: searchSchema,
  component: RouteComponent,
  loader: async ({ params: { routineId }, context: { queryClient, user } }) => {
    if (!(await canManageRoutines(queryClient, user))) {
      throw redirect({ to: '/chat' });
    }
    const routine = await queryClient.query({
      queryKey: getRoutinesControllerFindOneQueryKey(routineId),
      queryFn: () => routinesControllerFindOne(routineId),
      // A cached routine may show a finished run that is running again,
      // which would offer Run now during the run.
      staleTime: 0,
    });
    return { routine };
  },
});

function RouteComponent() {
  const { routine } = Route.useLoaderData();
  const { tab = 'configuration', page = 1 } = Route.useSearch();
  return (
    <RoutinePage key={routine.id} routine={routine} tab={tab} page={page} />
  );
}
