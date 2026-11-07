import { createFileRoute, redirect } from '@tanstack/react-router';
import { z } from 'zod';
import { InboxPage, notificationsPageParams } from '@/pages/inbox';
import {
  getNotificationsControllerFindAllQueryKey,
  notificationsControllerFindAll,
} from '@/shared/api/generated/ayunisCoreAPI';
import { NotificationType } from '@/shared/api/generated/ayunisCoreAPI.schemas';
import { getFeatureToggles } from './-routines-enabled-query';

const searchSchema = z.object({
  page: z.number().min(1).optional().catch(1),
  type: z.enum(NotificationType).optional().catch(undefined),
});

export const Route = createFileRoute('/_authenticated/inbox/')({
  validateSearch: searchSchema,
  loaderDeps: ({ search }) => search,
  component: RouteComponent,
  loader: async ({ deps: { page = 1, type }, context: { queryClient } }) => {
    const toggles = await getFeatureToggles(queryClient);
    if (!toggles.routinesEnabled) {
      throw redirect({ to: '/chat' });
    }
    if (
      type === NotificationType.release_note &&
      !toggles.releaseNotesEnabled
    ) {
      throw redirect({ to: '/inbox' });
    }
    const params = notificationsPageParams(page, type);
    await queryClient.query({
      queryKey: getNotificationsControllerFindAllQueryKey(params),
      queryFn: () => notificationsControllerFindAll(params),
    });
    return { page, type };
  },
});

function RouteComponent() {
  const { page, type } = Route.useLoaderData();
  return <InboxPage page={page} type={type} />;
}
