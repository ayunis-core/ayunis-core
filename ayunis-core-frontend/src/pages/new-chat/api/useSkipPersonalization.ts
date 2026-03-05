import {
  useChatSettingsControllerUpsertSystemPrompt,
  getChatSettingsControllerGetSystemPromptQueryKey,
} from '@/shared/api/generated/ayunisCoreAPI';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { showError } from '@/shared/lib/toast';

/**
 * Cross-stack contract: the backend stores this as a real system prompt value.
 * `useUserSystemPromptStatus` treats any non-null value as "has prompt",
 * so this sentinel means "user explicitly skipped personalization."
 */
const SKIP_SENTINEL = '-';

export function useSkipPersonalization(onSuccess?: () => void) {
  const { t } = useTranslation('chat');
  const queryClient = useQueryClient();
  const router = useRouter();
  const queryKey = getChatSettingsControllerGetSystemPromptQueryKey();

  const mutation = useChatSettingsControllerUpsertSystemPrompt({
    mutation: {
      onSuccess,
      onError: () => {
        showError(t('newChat.personalization.skipError'));
      },
      onSettled: async () => {
        await queryClient.invalidateQueries({ queryKey });
        await router.invalidate();
      },
    },
  });

  function skip() {
    mutation.mutate({ data: { systemPrompt: SKIP_SENTINEL } });
  }

  return { skip, isSkipping: mutation.isPending };
}
