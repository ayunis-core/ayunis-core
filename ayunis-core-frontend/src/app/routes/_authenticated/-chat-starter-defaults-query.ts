import type { QueryClient } from '@tanstack/react-query';
import { anonymousModeDefaultQueryOptions } from '@/features/anonymous-mode-default';
import {
  getModelsControllerIsEmbeddingModelEnabledQueryKey,
  modelsControllerIsEmbeddingModelEnabled,
} from '@/shared/api/generated/ayunisCoreAPI';
import type { ChatStarterDefaults } from '@/widgets/chat-starter';
import {
  defaultModelSelectionQueryOptions,
  toComposerValue,
} from './-default-model-selection-query';

export async function loadChatStarterDefaults(
  queryClient: QueryClient,
): Promise<ChatStarterDefaults> {
  const [defaultSelection, embeddingModelResponse] = await Promise.all([
    queryClient.query(defaultModelSelectionQueryOptions()).catch(() => null),
    queryClient
      .query({
        queryKey: getModelsControllerIsEmbeddingModelEnabledQueryKey(),
        queryFn: () => modelsControllerIsEmbeddingModelEnabled(),
      })
      .catch(() => null),
    queryClient.query(anonymousModeDefaultQueryOptions()),
  ]);
  return {
    selectedModelId: toComposerValue(defaultSelection),
    isEmbeddingModelEnabled:
      embeddingModelResponse?.isEmbeddingModelEnabled ?? false,
  };
}
