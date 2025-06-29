import { useThreadsControllerUpdateModel } from "@/shared/api/generated/ayunisCoreAPI";
import type { UpdateThreadModelDto } from "@/shared/api/generated/ayunisCoreAPI.schemas";
import type { Model } from "../model/openapi";

export function useUpdateThreadModel() {
  const mutation = useThreadsControllerUpdateModel();

  async function updateModel(threadId: string, model: Model): Promise<void> {
    const data: UpdateThreadModelDto = {
      modelName: model.name,
      modelProvider: model.provider as UpdateThreadModelDto["modelProvider"],
    };
    await mutation.mutateAsync({ id: threadId, data });
  }

  return {
    updateModel,
    isUpdating: mutation.isPending,
    error: mutation.error,
  };
}
