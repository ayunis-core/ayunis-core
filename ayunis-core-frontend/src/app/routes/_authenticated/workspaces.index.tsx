import { createFileRoute, redirect } from '@tanstack/react-router';
import { WorkspacesPage } from '@/pages/workspaces';
import {
  workspacesControllerFindAll,
  getWorkspacesControllerFindAllQueryKey,
  appControllerFeatureToggles,
  getAppControllerFeatureTogglesQueryKey,
} from '@/shared/api/generated/ayunisCoreAPI';

export const Route = createFileRoute('/_authenticated/workspaces/')({
  component: RouteComponent,
  loader: async ({ context: { queryClient } }) => {
    const featureToggles = await queryClient.fetchQuery({
      queryKey: getAppControllerFeatureTogglesQueryKey(),
      queryFn: () => appControllerFeatureToggles(),
    });
    if (!featureToggles.workspacesEnabled) {
      throw redirect({ to: '/chat' });
    }
    const params = { limit: 100, offset: 0 };
    const workspaces = await queryClient.fetchQuery({
      queryKey: getWorkspacesControllerFindAllQueryKey(params),
      queryFn: () => workspacesControllerFindAll(params),
    });
    return { workspaces: workspaces.data };
  },
});

function RouteComponent() {
  const { workspaces } = Route.useLoaderData();
  return <WorkspacesPage workspaces={workspaces} />;
}
