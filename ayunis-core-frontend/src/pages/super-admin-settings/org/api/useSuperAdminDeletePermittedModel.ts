import {
  useSuperAdminModelsControllerDeletePermittedModel,
  type ModelWithConfigResponseDto,
  getSuperAdminModelsControllerGetAvailableModelsQueryKey,
} from "@/shared/api";
import { useConfirmation } from "@/widgets/confirmation-modal";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useRouter } from "@tanstack/react-router";

export function useSuperAdminDeletePermittedModel(orgId: string) {
  const { t } = useTranslation("admin-settings-models");
  const queryClient = useQueryClient();
  const router = useRouter();
  const { confirm } = useConfirmation();
  const deletePermittedModelMutation =
    useSuperAdminModelsControllerDeletePermittedModel({
      mutation: {
        onMutate: async ({ id }) => {
          const queryKey =
            getSuperAdminModelsControllerGetAvailableModelsQueryKey(orgId);
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
                return old;
              }
              return old.map((model) => {
                if (model.permittedModelId === id) {
                  return {
                    ...model,
                    isPermitted: false,
                    permittedModelId: null,
                  };
                }
                return model;
              });
            },
          );

          return { previousData, queryKey };
        },
        onSettled: () => {
          // Invalidate queries by partial key until API is regenerated
          queryClient.invalidateQueries({
            predicate: (query) => {
              const key = query.queryKey;
              return (
                Array.isArray(key) &&
                key.length > 0 &&
                typeof key[0] === "string" &&
                key[0].includes("superAdminModels") &&
                key[0].includes("permitted")
              );
            },
          });
          router.invalidate();
        },
        onError: (error, _, context) => {
          console.error("Error deleting permitted model", error);

          if (context?.previousData && context?.queryKey) {
            queryClient.setQueryData(context.queryKey, context.previousData);
          }
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
        deletePermittedModelMutation.mutate({ orgId, id });
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
