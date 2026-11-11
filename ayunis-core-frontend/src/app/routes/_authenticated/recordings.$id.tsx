import { createFileRoute, redirect } from '@tanstack/react-router';
import { RecordingPage } from '@/pages/recording';
import {
  getMyPermissionsControllerGetMineQueryKey,
  getRecordingsControllerFindOneQueryKey,
  getTeamsControllerListMyTeamsQueryKey,
  getWorkspacesControllerFindOneQueryKey,
  myPermissionsControllerGetMine,
  recordingsControllerFindOne,
  teamsControllerListMyTeams,
  workspacesControllerFindOne,
} from '@/shared/api/generated/ayunisCoreAPI';
import { requireRecordingsEnabled } from './-recordings-enabled';

export const Route = createFileRoute('/_authenticated/recordings/$id')({
  component: RouteComponent,
  loader: async ({ context: { queryClient }, params: { id } }) => {
    await requireRecordingsEnabled(queryClient);
    const recording = await queryClient
      .query({
        queryKey: getRecordingsControllerFindOneQueryKey(id),
        queryFn: () => recordingsControllerFindOne(id),
      })
      .catch(() => {
        throw redirect({ to: '/recordings' });
      });
    // Teams and permissions decide who may manage team and organization
    // recordings, so they are loaded before the first paint.
    const [workspace] = await Promise.all([
      recording.workspaceId
        ? queryClient.query({
            queryKey: getWorkspacesControllerFindOneQueryKey(
              recording.workspaceId,
            ),
            queryFn: () => workspacesControllerFindOne(recording.workspaceId!),
          })
        : undefined,
      queryClient.query({
        queryKey: getTeamsControllerListMyTeamsQueryKey(),
        queryFn: () => teamsControllerListMyTeams(),
      }),
      queryClient.query({
        queryKey: getMyPermissionsControllerGetMineQueryKey(),
        queryFn: () => myPermissionsControllerGetMine(),
      }),
    ]);
    return { recording, workspace };
  },
});

function RouteComponent() {
  const { recording, workspace } = Route.useLoaderData();
  return (
    <RecordingPage
      key={recording.id}
      recording={recording}
      workspace={workspace}
    />
  );
}
