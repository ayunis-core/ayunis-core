import { createFileRoute, redirect } from '@tanstack/react-router';
import { ReleaseNotesPage } from '@/pages/release-notes';
import {
  getReleaseNotesControllerFindAllQueryKey,
  releaseNotesControllerFindAll,
} from '@/shared/api/generated/ayunisCoreAPI';
import { getFeatureToggles } from './-routines-enabled-query';

export const Route = createFileRoute('/_authenticated/news/')({
  component: RouteComponent,
  loader: async ({ context: { queryClient } }) => {
    const toggles = await getFeatureToggles(queryClient);
    if (!toggles.releaseNotesEnabled) {
      throw redirect({ to: '/chat' });
    }
    const releaseNotes = await queryClient.query({
      queryKey: getReleaseNotesControllerFindAllQueryKey(),
      queryFn: () => releaseNotesControllerFindAll(),
      // The unread dots must match what the user has opened since.
      staleTime: 0,
    });
    return { releaseNotes };
  },
});

function RouteComponent() {
  const { releaseNotes } = Route.useLoaderData();
  return <ReleaseNotesPage releaseNotes={releaseNotes} />;
}
