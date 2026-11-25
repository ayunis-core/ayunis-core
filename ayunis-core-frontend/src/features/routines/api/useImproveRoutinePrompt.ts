import { useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { routinesControllerImprovePrompt } from '@ayunis/api-client/endpoints';
import { showError } from '@/shared/lib/toast';
import { improveTextErrorKey } from '@/shared/ui/improve-text-button';

interface ImproveRoutinePromptParams {
  name?: string;
  prompt: string;
}

export function useImproveRoutinePrompt() {
  const { t, i18n } = useTranslation('common');

  return useMutation({
    mutationFn: async (params: ImproveRoutinePromptParams) => {
      const { text } = await routinesControllerImprovePrompt({
        ...params,
        language: i18n.resolvedLanguage === 'de' ? 'de' : 'en',
      });
      return text;
    },
    onError: (error) => {
      showError(
        t(
          improveTextErrorKey(error, {
            emptyAnswer: 'ROUTINE_PROMPT_IMPROVEMENT_FAILED',
            anonymousOnly: 'ROUTINE_PROMPT_IMPROVEMENT_UNAVAILABLE',
          }),
        ),
      );
    },
  });
}
