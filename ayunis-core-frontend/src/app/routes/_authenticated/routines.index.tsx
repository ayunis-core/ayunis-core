import { createFileRoute, redirect } from '@tanstack/react-router';
import { RoutinesPage } from '@/pages/routines';
import {
  getRoutinesControllerFindAllQueryKey,
  routinesControllerFindAll,
} from '@/shared/api/generated/ayunisCoreAPI';
import { canManageRoutines } from './-manage-routines-access';

export const Route = createFileRoute('/_authenticated/routines/')({
  component: RoutinesPage,
  loader: async ({ context: { queryClient, user } }) => {
    if (!(await canManageRoutines(queryClient, user))) {
      throw redirect({ to: '/chat' });
    }
    await queryClient.query({
      queryKey: getRoutinesControllerFindAllQueryKey(),
      queryFn: () => routinesControllerFindAll(),
    });
  },
});
