import { createFileRoute } from '@tanstack/react-router';
import ModelsCatalogPage from '@/pages/super-admin-settings/models-catalog';
import {
  getSuperAdminCatalogModelsControllerGetAllCatalogModelsQueryKey,
  superAdminCatalogModelsControllerGetAllCatalogModels,
} from '@/shared/api';

export const Route = createFileRoute(
  '/_authenticated/super-admin-settings/models-catalog/',
)({
  component: RouteComponent,
  loader: async ({ context: { queryClient } }) => {
    return {
      models: await queryClient.fetchQuery({
        queryKey:
          getSuperAdminCatalogModelsControllerGetAllCatalogModelsQueryKey(),
        queryFn: () => superAdminCatalogModelsControllerGetAllCatalogModels(),
      }),
    };
  },
});

function RouteComponent() {
  const { models } = Route.useLoaderData();
  return <ModelsCatalogPage models={models} />;
}
