import { createFileRoute, redirect } from '@tanstack/react-router';
import { WorkspaceMembersPage } from '@/pages/workspace/ui/WorkspaceMembersPage';
import {
  getWorkspaceMembersControllerListQueryKey,
  getWorkspacesControllerFindOneQueryKey,
  workspaceMembersControllerList,
  workspacesControllerFindOne,
} from '@/shared/api/generated/ayunisCoreAPI';

export const Route = createFileRoute(
  '/_authenticated/workspaces_/$workspaceId/members',
)({
  component: RouteComponent,
  loader: async ({ context: { queryClient }, params: { workspaceId } }) => {
    try {
      const [workspace, members] = await Promise.all([
        queryClient.query({
          queryKey: getWorkspacesControllerFindOneQueryKey(workspaceId),
          queryFn: () => workspacesControllerFindOne(workspaceId),
        }),
        queryClient.query({
          queryKey: getWorkspaceMembersControllerListQueryKey(workspaceId),
          queryFn: () => workspaceMembersControllerList(workspaceId),
        }),
      ]);
      return { workspace, members };
    } catch {
      throw redirect({ to: '/workspaces' });
    }
  },
});

function RouteComponent() {
  return <WorkspaceMembersPage {...Route.useLoaderData()} />;
}
