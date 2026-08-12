import { createFileRoute, redirect } from '@tanstack/react-router';
import { WorkspacePage } from '@/pages/workspace';
import {
  workspacesControllerFindOne,
  getWorkspacesControllerFindOneQueryKey,
  threadsControllerFindAll,
  getThreadsControllerFindAllQueryKey,
  appControllerFeatureToggles,
  getAppControllerFeatureTogglesQueryKey,
} from '@/shared/api/generated/ayunisCoreAPI';

const WORKSPACE_CHATS_LIMIT = 100;

export const Route = createFileRoute('/_authenticated/workspaces/$workspaceId')(
  {
    component: RouteComponent,
    loader: async ({ params: { workspaceId }, context: { queryClient } }) => {
      const featureToggles = await queryClient.fetchQuery({
        queryKey: getAppControllerFeatureTogglesQueryKey(),
        queryFn: () => appControllerFeatureToggles(),
      });
      if (!featureToggles.workspacesEnabled) {
        throw redirect({ to: '/chat' });
      }

      const chatsParams = {
        workspaceId,
        limit: WORKSPACE_CHATS_LIMIT,
        offset: 0,
      };

      // Only a missing workspace should redirect. A transient failure loading
      // the chats must not look like "this workspace does not exist".
      const workspace = await queryClient
        .fetchQuery({
          queryKey: getWorkspacesControllerFindOneQueryKey(workspaceId),
          queryFn: () => workspacesControllerFindOne(workspaceId),
        })
        .catch(() => {
          throw redirect({ to: '/workspaces' });
        });

      const chats = await queryClient.fetchQuery({
        queryKey: getThreadsControllerFindAllQueryKey(chatsParams),
        queryFn: () => threadsControllerFindAll(chatsParams),
      });

      return {
        workspace,
        chats: chats.data,
        // The list is capped, so the badge must use the server's total rather
        // than the number of rows that happened to fit in one page.
        // `total` is optional in the generated DTO; fall back to what loaded.
        chatCount: chats.pagination.total ?? chats.data.length,
      };
    },
  },
);

function RouteComponent() {
  const { workspace, chats, chatCount } = Route.useLoaderData();
  return (
    <WorkspacePage workspace={workspace} chats={chats} chatCount={chatCount} />
  );
}
