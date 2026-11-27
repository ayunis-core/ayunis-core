import {
  useAcademyAccessControllerGetStatus,
  useAppControllerFeatureToggles,
  useModelModesControllerGetModelModes,
  useModelsControllerGetPermittedLanguageModels,
  useModelsControllerIsEmbeddingModelEnabled,
} from '@ayunis/api-client/endpoints';

function modelPlaceholder({
  isLoading,
  isError,
  data,
}: Readonly<{ isLoading: boolean; isError: boolean; data?: unknown }>) {
  if (isLoading) return 'Loading models...';
  if (isError) return 'Error loading models';
  if (!data) return 'No models available';
  return 'Select a model';
}

export function useComposerModels() {
  const permitted = useModelsControllerGetPermittedLanguageModels();
  const modes = useModelModesControllerGetModelModes({
    // Resolutions follow grants, catalog flags and mode lists, which admins
    // change server-side; a cached copy can point at a model no longer allowed.
    query: { staleTime: 0 },
  });
  return {
    models: permitted.data ?? [],
    resolutions: modes.data ?? [],
    placeholder: modelPlaceholder(permitted),
    unavailable: permitted.isLoading || permitted.isError || !permitted.data,
    loading: permitted.isPending,
    loaded: permitted.isSuccess,
  };
}

export type ComposerModels = ReturnType<typeof useComposerModels>;

export function useComposerEnvironment() {
  const toggles = useAppControllerFeatureToggles();
  const academy = useAcademyAccessControllerGetStatus({
    // The default retries would leave the composer disabled for seconds
    // during an outage of the access endpoint.
    query: { retry: false },
  });
  const embedding = useModelsControllerIsEmbeddingModelEnabled();
  return {
    voice: !toggles.error && toggles.data?.voiceEnabled === true,
    // An outage of the access endpoint must never lock people out.
    academyGated: academy.data ? !academy.data.allowed : false,
    documents: embedding.data?.isEmbeddingModelEnabled === true,
  };
}

export type ComposerEnvironment = ReturnType<typeof useComposerEnvironment>;
