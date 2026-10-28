import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  getFavoritesControllerFindAllQueryKey,
  useFavoritesControllerReorder,
} from '@/shared/api/generated/ayunisCoreAPI';
import { showError } from '@/shared/lib/toast';

export function useReorderFavorites() {
  const { t } = useTranslation('common');
  const queryClient = useQueryClient();
  return useFavoritesControllerReorder({
    mutation: {
      onSettled: async () => {
        await queryClient.invalidateQueries({
          queryKey: getFavoritesControllerFindAllQueryKey(),
        });
      },
      onError: () => {
        showError(t('sidebar.pinError'));
      },
    },
  });
}
