import type { QueryClient } from '@tanstack/react-query';
import type { useRouter } from '@tanstack/react-router';
import {
  getSuperAdminPermittedModelsControllerGetAvailableLanguageModelsQueryKey,
  getSuperAdminPermittedModelsControllerGetAvailableEmbeddingModelsQueryKey,
  getSuperAdminPermittedModelsControllerGetAvailableImageGenerationModelsQueryKey,
  getSuperAdminPermittedModelsControllerGetPermittedModelsQueryKey,
} from '@/shared/api';

export function invalidatePermittedModelQueries(
  queryClient: QueryClient,
  router: ReturnType<typeof useRouter>,
  orgId: string,
): void {
  const queryKeys = [
    getSuperAdminPermittedModelsControllerGetAvailableLanguageModelsQueryKey(
      orgId,
    ),
    getSuperAdminPermittedModelsControllerGetAvailableEmbeddingModelsQueryKey(
      orgId,
    ),
    getSuperAdminPermittedModelsControllerGetAvailableImageGenerationModelsQueryKey(
      orgId,
    ),
    getSuperAdminPermittedModelsControllerGetPermittedModelsQueryKey(orgId),
  ];
  queryKeys.forEach((key) => {
    void queryClient.invalidateQueries({ queryKey: key });
  });
  void router.invalidate();
}
