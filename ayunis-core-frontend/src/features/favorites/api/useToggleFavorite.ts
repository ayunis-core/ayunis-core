import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import {
  getFavoritesControllerFindAllQueryKey,
  useFavoritesControllerToggle,
} from '@/shared/api/generated/ayunisCoreAPI';
import type { ToggleFavoriteDtoReferenceType } from '@/shared/api/generated/ayunisCoreAPI.schemas';
import { showError } from '@/shared/lib/toast';

export function useToggleFavorite() {
  const { t } = useTranslation('common');
  const queryClient = useQueryClient();
  const router = useRouter();
  const mutation = useFavoritesControllerToggle({
    mutation: {
      onSettled: async () => {
        await queryClient.invalidateQueries({
          queryKey: getFavoritesControllerFindAllQueryKey(),
        });
        await router.invalidate();
      },
      onError: () => {
        showError(t('sidebar.pinError'));
      },
    },
  });

  function toggle(
    referenceType: ToggleFavoriteDtoReferenceType,
    referenceId: string,
  ) {
    mutation.mutate({ data: { referenceType, referenceId } });
  }

  return { ...mutation, toggle };
}
