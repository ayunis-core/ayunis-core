import { useModelsControllerGetPermittedLanguageModels } from '@/shared/api/generated/ayunisCoreAPI';

export function usePermittedModels() {
  const { data: permittedModels, isLoading } =
    useModelsControllerGetPermittedLanguageModels();

  const getPlaceholder = (): string => {
    if (isLoading) return 'Loading models...';
    if (!permittedModels) return 'No models available';
    return 'Select a model';
  };

  const isDisabled = isLoading || !permittedModels;

  return {
    models: permittedModels ?? [],
    isLoading,
    error: false,
    placeholder: getPlaceholder(),
    isDisabled,
  };
}
