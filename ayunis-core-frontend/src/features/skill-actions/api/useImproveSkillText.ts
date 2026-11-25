import { useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { skillsControllerImproveText } from '@ayunis/api-client/endpoints';
import type { ImproveSkillTextDtoField } from '@ayunis/api-client/schemas';
import { showError } from '@/shared/lib/toast';
import { improveTextErrorKey } from '@/shared/ui/improve-text-button';

interface ImproveSkillTextParams {
  field: ImproveSkillTextDtoField;
  name?: string;
  trigger: string;
  instructions: string;
  /** Set in a workspace's skill editor, where the workspace role decides. */
  workspaceId?: string;
}

export function useImproveSkillText() {
  const { t, i18n } = useTranslation('common');

  return useMutation({
    mutationFn: async (params: ImproveSkillTextParams) => {
      const { text } = await skillsControllerImproveText({
        ...params,
        language: i18n.resolvedLanguage === 'de' ? 'de' : 'en',
      });
      return text;
    },
    onError: (error) => {
      showError(
        t(
          improveTextErrorKey(error, {
            emptyAnswer: 'SKILL_TEXT_IMPROVEMENT_FAILED',
            anonymousOnly: 'SKILL_TEXT_IMPROVEMENT_UNAVAILABLE',
          }),
        ),
      );
    },
  });
}
