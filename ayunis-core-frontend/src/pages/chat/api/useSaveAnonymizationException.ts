import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  anonymizationSettingsControllerGet,
  anonymizationSettingsControllerUpdate,
  getAnonymizationSettingsControllerGetQueryKey,
} from '@ayunis/api-client';
import extractErrorData from '@/shared/api/extract-error-data';
import { showError, showSuccess } from '@/shared/lib/toast';
import {
  currentPattern,
  withException,
} from '@/pages/chat/lib/anonymization-exception';
import type { AnonymizationException } from '@/pages/chat/lib/anonymization-exception';

interface SaveAnonymizationExceptionInput {
  exception: AnonymizationException;
  /** The category's rule as the card showed it to the admin. */
  shownPattern: string | null | undefined;
}

class WhitelistChangedError extends Error {}

/**
 * Saves through the admin whitelist endpoint, which replaces the whole list.
 * The list is re-read first: if the category's rule is no longer the one the
 * admin confirmed, nothing is saved and the card shows the current rule.
 */
export function useSaveAnonymizationException() {
  const { t } = useTranslation('chat');
  const queryClient = useQueryClient();
  const whitelistKey = getAnonymizationSettingsControllerGetQueryKey();
  return useMutation({
    // One save at a time, so each reads the list the previous one wrote.
    scope: { id: 'pii-whitelist' },
    mutationFn: async ({
      exception,
      shownPattern,
    }: SaveAnonymizationExceptionInput) => {
      const { entries } = await anonymizationSettingsControllerGet();
      if (currentPattern(entries, exception.category) !== shownPattern) {
        throw new WhitelistChangedError();
      }
      return anonymizationSettingsControllerUpdate({
        entries: withException(entries, exception),
      });
    },
    onSuccess: (whitelist) => {
      queryClient.setQueryData(whitelistKey, whitelist);
      showSuccess(t('chat.tools.add_anonymization_exception.success'));
    },
    onError: (error) => {
      if (error instanceof WhitelistChangedError) {
        void queryClient.invalidateQueries({ queryKey: whitelistKey });
        showError(t('chat.tools.add_anonymization_exception.ruleChanged'));
        return;
      }
      try {
        const { code } = extractErrorData(error);
        showError(
          code === 'INVALID_PATTERN'
            ? t('chat.tools.add_anonymization_exception.invalidPattern')
            : t('chat.tools.add_anonymization_exception.error'),
        );
      } catch {
        showError(t('chat.tools.add_anonymization_exception.error'));
      }
    },
  });
}
