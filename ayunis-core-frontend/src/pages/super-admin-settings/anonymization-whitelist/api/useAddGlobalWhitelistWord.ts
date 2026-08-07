import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  useSuperAdminAnonymizationWhitelistControllerAdd,
  getSuperAdminAnonymizationWhitelistControllerListQueryKey,
} from '@/shared/api';
import type { PiiCategory } from '@/shared/api';
import extractErrorData from '@/shared/api/extract-error-data';
import { showSuccess, showError } from '@/shared/lib/toast';

interface AddWordParams {
  category: PiiCategory;
  word: string;
  onSuccess?: () => void;
}

export function useAddGlobalWhitelistWord() {
  const { t } = useTranslation('super-admin-settings-anonymization');
  const queryClient = useQueryClient();

  const mutation = useSuperAdminAnonymizationWhitelistControllerAdd({
    mutation: {
      onSuccess: () => {
        void queryClient.invalidateQueries({
          queryKey: getSuperAdminAnonymizationWhitelistControllerListQueryKey(),
        });
        showSuccess(t('add.success'));
      },
      onError: (error) => {
        try {
          const { code } = extractErrorData(error);
          switch (code) {
            case 'DUPLICATE_GLOBAL_WHITELIST_WORD':
              showError(t('add.duplicate'));
              break;
            case 'EMPTY_GLOBAL_WHITELIST_WORD':
              showError(t('add.empty'));
              break;
            default:
              showError(t('add.error'));
          }
        } catch {
          showError(t('add.error'));
        }
      },
    },
  });

  function addWord({ category, word, onSuccess }: AddWordParams) {
    mutation.mutate({ data: { category, word } }, { onSuccess });
  }

  return { addWord, isPending: mutation.isPending };
}
