import {
  useModelsControllerDeletePermittedModel,
  type ModelWithConfigResponseDto,
  getModelsControllerGetAvailableModelsWithConfigQueryKey,
  getModelsControllerGetUserSpecificDefaultModelQueryKey,
  getModelsControllerGetPermittedLanguageModelsQueryKey,
  getAgentsControllerFindAllQueryKey,
  getThreadsControllerFindAllQueryKey,
} from "@/shared/api";
import { useConfirmation } from "@/widgets/confirmation-modal";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

export function useDeletePermittedModel() {
  const { t } = useTranslation("admin-settings-models");
  const queryClient = useQueryClient();
  const { confirm } = useConfirmation();
  const deletePermittedModelMutation = useModelsControllerDeletePermittedModel({
    mutation: {
      onMutate: async ({ id }) => {
        const queryKey =
          getModelsControllerGetAvailableModelsWithConfigQueryKey();

        await queryClient.cancelQueries({
          queryKey,
        });

        const previousData =
          queryClient.getQueryData<ModelWithConfigResponseDto[]>(queryKey);

        // Optimistically update to the new value
        queryClient.setQueryData<ModelWithConfigResponseDto[]>(
          queryKey,
          (old) => {
            if (!old) {
              console.warn("No previous data found for optimistic update");
              return old;
            }

            return old.map((item: ModelWithConfigResponseDto) => {
              // Match by permittedModelId since that's what the delete endpoint expects
              if (item.permittedModelId === id) {
                console.log(
                  "Found matching model, updating isPermitted to false",
                );
                return { ...item, isPermitted: false };
              }
              return item;
            });
          },
        );

        return { previousData, queryKey };
      },
      onError: (error, _, context) => {
        console.error("Error deleting permitted model", error);
        if (context?.previousData && context?.queryKey) {
          queryClient.setQueryData(context.queryKey, context.previousData);
        }
      },
      onSettled: () => {
        const queryKeys = [
          getModelsControllerGetAvailableModelsWithConfigQueryKey(),
          getModelsControllerGetPermittedLanguageModelsQueryKey(),
          getModelsControllerGetUserSpecificDefaultModelQueryKey(),
          getAgentsControllerFindAllQueryKey(),
          getThreadsControllerFindAllQueryKey(),
        ];
        queryKeys.forEach((queryKey) => {
          queryClient.invalidateQueries({
            queryKey,
          });
        });
      },
    },
  });

  function deletePermittedModel(id: string) {
    confirm({
      title: t("models.deletePermittedModel.title"),
      description: t("models.deletePermittedModel.description"),
      confirmText: t("models.deletePermittedModel.confirmText"),
      cancelText: t("models.deletePermittedModel.cancelText"),
      variant: "destructive",
      onConfirm: () => {
        deletePermittedModelMutation.mutate({ id });
      },
    });
  }

  return {
    deletePermittedModel,
    isLoading: deletePermittedModelMutation.isPending,
    isError: deletePermittedModelMutation.isError,
    error: deletePermittedModelMutation.error,
  };
}
