import { createFileRoute } from '@tanstack/react-router';
import ModelsCatalogPage from '@/pages/super-admin-settings/models-catalog';
import {
  getSuperAdminModelsControllerGetAllCatalogModelsQueryKey,
  superAdminModelsControllerGetAllCatalogModels,
} from '@/shared/api';

export const Route = createFileRoute(
  '/_authenticated/super-admin-settings/models-catalog/',
)({
  component: RouteComponent,
  loader: async ({ context: { queryClient } }) => {
    return {
      models: await queryClient.fetchQuery({
        queryKey: getSuperAdminModelsControllerGetAllCatalogModelsQueryKey(),
        queryFn: () => superAdminModelsControllerGetAllCatalogModels(),
      }),
    };
  },
});

function RouteComponent() {
  const { models } = Route.useLoaderData();
  return <ModelsCatalogPage models={models} />;
}
