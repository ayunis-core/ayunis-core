import { useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { skillsControllerImproveText } from '@/shared/api/generated/ayunisCoreAPI';
import type { ImproveSkillTextDtoField } from '@/shared/api/generated/ayunisCoreAPI.schemas';
import extractErrorData from '@/shared/api/extract-error-data';
import { showError } from '@/shared/lib/toast';

interface ImproveSkillTextParams {
  field: ImproveSkillTextDtoField;
  name?: string;
  trigger: string;
  instructions: string;
}

export function useImproveSkillText() {
  const { t } = useTranslation('skills');

  return useMutation({
    mutationFn: async (params: ImproveSkillTextParams) => {
      const { text } = await skillsControllerImproveText(params);
      return text;
    },
    onError: (error) => {
      try {
        const { code } = extractErrorData(error);
        switch (code) {
          case 'SKILL_TEXT_IMPROVEMENT_FAILED':
            showError(t('improve.emptyAnswer'));
            break;
          case 'NO_DEFAULT_MODEL_FOUND':
            showError(t('improve.noModel'));
            break;
          default:
            showError(t('improve.error'));
        }
      } catch {
        showError(t('improve.error'));
      }
    },
  });
}
