import { useModelsControllerGetPermittedModels } from "@/shared/api/generated/ayunisCoreAPI";

export function usePermittedModels() {
  const {
    data: permittedModels,
    isLoading,
    error,
  } = useModelsControllerGetPermittedModels();

  const getPlaceholder = (): string => {
    if (isLoading) return "Loading models...";
    if (error) return "Error loading models";
    if (!permittedModels) return "No models available";
    return "Select a model";
  };

  const isDisabled = isLoading || !!error || !permittedModels;

  return {
    models: permittedModels ?? [],
    isLoading,
    error: !!error,
    placeholder: getPlaceholder(),
    isDisabled,
  };
}
