import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  useSuperAdminAnonymizationWhitelistControllerAdd,
  getSuperAdminAnonymizationWhitelistControllerListQueryKey,
} from '@/shared/api';
import type {
  AddGlobalPiiWhitelistWordsResponseDto,
  PiiCategory,
} from '@/shared/api';
import extractErrorData from '@/shared/api/extract-error-data';
import { showSuccess, showError } from '@/shared/lib/toast';

interface AddWordsParams {
  category: PiiCategory;
  words: string[];
  onSuccess?: () => void;
}

export function useAddGlobalWhitelistWords() {
  const { t } = useTranslation('super-admin-settings-anonymization');
  const queryClient = useQueryClient();

  function notify(result: AddGlobalPiiWhitelistWordsResponseDto) {
    if (result.added.length === 0) {
      showError(t('add.allDuplicates', { count: result.duplicates.length }));
      return;
    }
    if (result.duplicates.length > 0) {
      showSuccess(
        t('add.successWithDuplicates', {
          count: result.added.length,
          duplicates: result.duplicates.length,
        }),
      );
      return;
    }
    showSuccess(t('add.success', { count: result.added.length }));
  }

  const mutation = useSuperAdminAnonymizationWhitelistControllerAdd({
    mutation: {
      onSuccess: (result) => {
        void queryClient.invalidateQueries({
          queryKey: getSuperAdminAnonymizationWhitelistControllerListQueryKey(),
        });
        notify(result);
      },
      onError: (error) => {
        try {
          const { code } = extractErrorData(error);
          if (code === 'EMPTY_GLOBAL_WHITELIST_WORD') {
            showError(t('add.empty'));
          } else {
            showError(t('add.error'));
          }
        } catch {
          showError(t('add.error'));
        }
      },
    },
  });

  function addWords({ category, words, onSuccess }: AddWordsParams) {
    mutation.mutate({ data: { category, words } }, { onSuccess });
  }

  return { addWords, isPending: mutation.isPending };
}
