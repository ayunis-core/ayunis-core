import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  getSkillsControllerFindInstalledFromMarketplaceQueryKey,
  skillsControllerInstallFromMarketplace,
} from '@/shared/api';
import extractErrorData from '@/shared/api/extract-error-data';
import { showError, showSuccess } from '@/shared/lib/toast';
import { invalidateChatSkillQueries } from './invalidateChatSkillQueries';

interface InstallMarketplaceSkillFromChatInput {
  identifier: string;
}

export function useInstallMarketplaceSkillFromChat({
  threadId,
  onInstalled,
}: {
  threadId?: string;
  onInstalled: () => void;
}) {
  const { t } = useTranslation('chat');
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ identifier }: InstallMarketplaceSkillFromChatInput) =>
      skillsControllerInstallFromMarketplace({ identifier }),
    onSuccess: (_skill, { identifier }) => {
      onInstalled();
      showSuccess(t('chat.tools.install_marketplace_skill.success'));
      invalidateChatSkillQueries(queryClient, { threadId });
      void queryClient.invalidateQueries({
        queryKey:
          getSkillsControllerFindInstalledFromMarketplaceQueryKey(identifier),
      });
    },
    onError: (error) => {
      try {
        const { code } = extractErrorData(error);
        switch (code) {
          case 'MARKETPLACE_SKILL_NOT_FOUND':
            showError(t('chat.tools.install_marketplace_skill.notFound'));
            break;
          case 'MARKETPLACE_UNAVAILABLE':
            showError(t('chat.tools.install_marketplace_skill.unavailable'));
            break;
          default:
            showError(t('chat.tools.install_marketplace_skill.error'));
        }
      } catch {
        showError(t('chat.tools.install_marketplace_skill.error'));
      }
    },
  });
}
