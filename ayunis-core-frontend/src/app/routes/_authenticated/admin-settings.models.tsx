import { createFileRoute } from "@tanstack/react-router";
import { queryOptions } from "@tanstack/react-query";
import {
  modelsControllerGetAllModelProviderInfosWithPermittedStatus,
  modelsControllerGetAvailableModelsWithConfig,
} from "@/shared/api/generated/ayunisCoreAPI";
import ModelSettingsPage from "@/pages/admin-settings/model-settings";

const modelsQueryOptions = () =>
  queryOptions({
    queryKey: ["permitted-models"],
    queryFn: () => modelsControllerGetAvailableModelsWithConfig(),
  });

const providersQueryOptions = () =>
  queryOptions({
    queryKey: ["permitted-providers"],
    queryFn: () =>
      modelsControllerGetAllModelProviderInfosWithPermittedStatus(),
  });

export const Route = createFileRoute("/_authenticated/admin-settings/models")({
  component: RouteComponent,
  loader: async ({ context: { queryClient } }) => {
    const models = await queryClient.ensureQueryData(modelsQueryOptions());
    const providers = await queryClient.ensureQueryData(
      providersQueryOptions(),
    );
    return { models, providers };
  },
});

function RouteComponent() {
  const { models, providers } = Route.useLoaderData();
  return (
    <ModelSettingsPage models={models || []} providers={providers || []} />
  );
}
