import { createFileRoute, redirect } from '@tanstack/react-router';
import { RoutinesPage } from '@/pages/routines';
import {
  getRoutinesControllerFindAllQueryKey,
  routinesControllerFindAll,
} from '@/shared/api/generated/ayunisCoreAPI';
import { canManageRoutines } from './-manage-routines-access';
import { loadChatStarterDefaults } from './-chat-starter-defaults-query';

export const Route = createFileRoute('/_authenticated/routines/')({
  component: RouteComponent,
  loader: async ({ context: { queryClient, user } }) => {
    if (!(await canManageRoutines(queryClient, user))) {
      throw redirect({ to: '/chat' });
    }
    const [, chatStarter] = await Promise.all([
      queryClient.query({
        queryKey: getRoutinesControllerFindAllQueryKey(),
        queryFn: () => routinesControllerFindAll(),
      }),
      loadChatStarterDefaults(queryClient),
    ]);
    return { chatStarter };
  },
});

function RouteComponent() {
  const { chatStarter } = Route.useLoaderData();
  return <RoutinesPage chatStarter={chatStarter} />;
}
