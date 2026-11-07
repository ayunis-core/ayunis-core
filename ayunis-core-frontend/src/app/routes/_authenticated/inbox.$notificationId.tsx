import { createFileRoute, redirect } from '@tanstack/react-router';
import { NotificationPage } from '@/pages/notification';
import {
  getNotificationsControllerFindOneQueryKey,
  notificationsControllerFindOne,
} from '@/shared/api/generated/ayunisCoreAPI';
import { isRoutinesEnabled } from './-routines-enabled-query';

export const Route = createFileRoute('/_authenticated/inbox/$notificationId')({
  component: RouteComponent,
  loader: async ({ params: { notificationId }, context: { queryClient } }) => {
    if (!(await isRoutinesEnabled(queryClient))) {
      throw redirect({ to: '/chat' });
    }
    const notification = await queryClient.query({
      queryKey: getNotificationsControllerFindOneQueryKey(notificationId),
      queryFn: () => notificationsControllerFindOne(notificationId),
    });
    return { notification };
  },
});

function RouteComponent() {
  const { notification } = Route.useLoaderData();
  return <NotificationPage notification={notification} />;
}
