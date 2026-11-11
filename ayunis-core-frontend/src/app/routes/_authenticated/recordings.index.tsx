import { createFileRoute } from '@tanstack/react-router';
import { RecordingsPage } from '@/pages/recordings';
import {
  getMyPermissionsControllerGetMineQueryKey,
  getRecordingsControllerFindAllQueryKey,
  getTeamsControllerListMyTeamsQueryKey,
  myPermissionsControllerGetMine,
  recordingsControllerFindAll,
  teamsControllerListMyTeams,
} from '@/shared/api/generated/ayunisCoreAPI';
import { personalRecordingListParams } from '@/shared/api/recording-scopes';
import { requireRecordingsEnabled } from './-recordings-enabled';

export const Route = createFileRoute('/_authenticated/recordings/')({
  component: RouteComponent,
  loader: async ({ context: { queryClient } }) => {
    await requireRecordingsEnabled(queryClient);
    // Teams and permissions decide which recordings the cards may delete, so
    // they are loaded before the first paint.
    const [recordings] = await Promise.all([
      queryClient.query({
        queryKey: getRecordingsControllerFindAllQueryKey(
          personalRecordingListParams,
        ),
        queryFn: () => recordingsControllerFindAll(personalRecordingListParams),
      }),
      queryClient.query({
        queryKey: getTeamsControllerListMyTeamsQueryKey(),
        queryFn: () => teamsControllerListMyTeams(),
      }),
      queryClient.query({
        queryKey: getMyPermissionsControllerGetMineQueryKey(),
        queryFn: () => myPermissionsControllerGetMine(),
      }),
    ]);
    return { recordings: recordings.data };
  },
});

function RouteComponent() {
  const { recordings } = Route.useLoaderData();
  return <RecordingsPage recordings={recordings} />;
}
