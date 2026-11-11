import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import {
  getFavoritesControllerFindAllQueryKey,
  getFavoritesControllerToggleMutationKey,
  useFavoritesControllerToggle,
  type FavoritesControllerToggleMutationVariables,
} from '@/shared/api/generated/ayunisCoreAPI';
import type { ToggleFavoriteDtoReferenceType } from '@/shared/api/generated/ayunisCoreAPI.schemas';
import { trackOpenPanelEvent } from '@/shared/lib/openpanel-events';
import { showError } from '@/shared/lib/toast';
import { isFavorite, type Favorite } from './useFavorites';

export function useToggleFavorite() {
  const { t } = useTranslation('common');
  const queryClient = useQueryClient();
  const router = useRouter();
  const mutation = useFavoritesControllerToggle({
    mutation: {
      // The toggle response doesn't say which way it went, so the direction
      // comes from the favorites list before the request. Nothing is tracked
      // without a loaded list, or while an earlier toggle of the same resource
      // is pending (it stays pending until the list was refetched after it).
      onMutate: ({ data }) => {
        const favorites = queryClient.getQueryData<Favorite[]>(
          getFavoritesControllerFindAllQueryKey(),
        );
        const pendingToggles = queryClient.isMutating({
          mutationKey: getFavoritesControllerToggleMutationKey(),
          predicate: ({ state }) =>
            isSameReference(state.variables, data.referenceId),
        });
        return {
          adds:
            favorites !== undefined &&
            pendingToggles === 1 &&
            !isFavorite(favorites, data.referenceId, data.referenceType),
        };
      },
      onSuccess: (_result, { data }, context) => {
        if (context.adds) {
          trackOpenPanelEvent('favorite_added', {
            resource_type: data.referenceType,
          });
        }
      },
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

function isSameReference(variables: unknown, referenceId: string): boolean {
  return (
    (variables as FavoritesControllerToggleMutationVariables | undefined)?.data
      .referenceId === referenceId
  );
}
