import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useQuery } from "@tanstack/react-query";
import { modelsControllerGetAvailableModelsWithConfig } from "@/shared/api/generated/ayunisCoreAPI";
import ModelSettingsPage from "@/pages/admin-settings/model-settings";

const modelsQueryOptions = () =>
  queryOptions({
    queryKey: ["permitted-models"],
    queryFn: () => modelsControllerGetAvailableModelsWithConfig(),
  });

export const Route = createFileRoute("/_authenticated/admin-settings/models")({
  component: RouteComponent,
  loader: async ({ context: { queryClient } }) => {
    const models = await queryClient.ensureQueryData(modelsQueryOptions());
    return models;
  },
});

function RouteComponent() {
  const { data: models } = useQuery(modelsQueryOptions());
  return <ModelSettingsPage models={models || []} />;
}
