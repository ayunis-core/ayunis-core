import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { skillsControllerCreate } from '@/shared/api';
import extractErrorData from '@/shared/api/extract-error-data';
import { showError, showSuccess } from '@/shared/lib/toast';
import { invalidateChatSkillQueries } from './invalidateChatSkillQueries';

interface CreateSkillFromChatInput {
  name: string;
  shortDescription: string;
  instructions: string;
  isActive: boolean;
}

export function useCreateSkillFromChat({
  threadId,
  workspaceId,
  onCreated,
}: {
  threadId?: string;
  workspaceId: string | null;
  onCreated: () => void;
}) {
  const { t } = useTranslation('chat');
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateSkillFromChatInput) =>
      skillsControllerCreate({
        ...data,
        ...(workspaceId
          ? { ownerType: 'workspace' as const, workspaceId }
          : { ownerType: 'personal' as const }),
      }),
    onSuccess: () => {
      onCreated();
      showSuccess(t('chat.tools.create_skill.success'));
      invalidateChatSkillQueries(queryClient, {
        threadId,
        workspaceId: workspaceId ?? undefined,
      });
    },
    onError: (error) => {
      try {
        const { code } = extractErrorData(error);
        showError(
          t(
            code === 'DUPLICATE_SKILL_NAME'
              ? 'chat.tools.create_skill.errorDuplicate'
              : 'chat.tools.create_skill.error',
          ),
        );
      } catch {
        showError(t('chat.tools.create_skill.error'));
      }
    },
  });
}
