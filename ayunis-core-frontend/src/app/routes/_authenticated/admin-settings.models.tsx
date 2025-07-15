import { createFileRoute } from "@tanstack/react-router";
import {
  getModelsControllerGetAllModelProviderInfosWithPermittedStatusQueryOptions,
  getModelsControllerGetAvailableModelsWithConfigQueryOptions,
} from "@/shared/api/generated/ayunisCoreAPI";
import ModelSettingsPage from "@/pages/admin-settings/model-settings";

export const Route = createFileRoute("/_authenticated/admin-settings/models")({
  component: RouteComponent,
  loader: async ({ context: { queryClient } }) => {
    const modelsQueryOptions =
      getModelsControllerGetAvailableModelsWithConfigQueryOptions();
    const providersQueryOptions =
      getModelsControllerGetAllModelProviderInfosWithPermittedStatusQueryOptions();
    await Promise.all([
      queryClient.fetchQuery(modelsQueryOptions),
      queryClient.fetchQuery(providersQueryOptions),
    ]);
  },
});

function RouteComponent() {
  return <ModelSettingsPage />;
}
