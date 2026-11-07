import { createFileRoute, redirect } from '@tanstack/react-router';
import { z } from 'zod';
import { InboxPage, notificationsPageParams } from '@/pages/inbox';
import {
  getNotificationsControllerFindAllQueryKey,
  notificationsControllerFindAll,
} from '@/shared/api/generated/ayunisCoreAPI';
import { isRoutinesEnabled } from './-routines-enabled-query';

const searchSchema = z.object({
  page: z.number().min(1).optional().catch(1),
});

export const Route = createFileRoute('/_authenticated/inbox/')({
  validateSearch: searchSchema,
  loaderDeps: ({ search }) => search,
  component: RouteComponent,
  loader: async ({ deps: { page = 1 }, context: { queryClient } }) => {
    if (!(await isRoutinesEnabled(queryClient))) {
      throw redirect({ to: '/chat' });
    }
    const params = notificationsPageParams(page);
    await queryClient.query({
      queryKey: getNotificationsControllerFindAllQueryKey(params),
      queryFn: () => notificationsControllerFindAll(params),
    });
    return { page };
  },
});

function RouteComponent() {
  const { page } = Route.useLoaderData();
  return <InboxPage page={page} />;
}
