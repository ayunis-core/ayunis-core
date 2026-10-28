import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  getSkillsControllerFindOneQueryKey,
  skillsControllerUpdate,
  useSkillsControllerFindAll,
  useSkillsControllerFindOne,
} from '@/shared/api';
import extractErrorData from '@/shared/api/extract-error-data';
import { personalSkillListParams } from '@/shared/api/skill-scopes';
import { showError, showSuccess } from '@/shared/lib/toast';
import { slugify } from '@/pages/chat/lib/slugify';
import { invalidateChatSkillQueries } from './invalidateChatSkillQueries';

interface EditSkillFromChatInput {
  name: string;
  shortDescription: string;
  instructions: string;
}

export function useEditSkillFromChat({
  skillId,
  skillSlug,
  threadId,
  workspaceId,
  onUpdated,
}: {
  skillId?: string;
  skillSlug: string;
  threadId?: string;
  workspaceId: string | null;
  onUpdated: () => void;
}) {
  const { t } = useTranslation('chat');
  const queryClient = useQueryClient();
  const isWorkspaceSlug = skillSlug.startsWith('workspace__');
  const detailQuery = useSkillsControllerFindOne(skillId ?? '', {
    query: { enabled: !!skillId, staleTime: Infinity },
  });
  const listQuery = useSkillsControllerFindAll(personalSkillListParams, {
    query: { enabled: !skillId && !isWorkspaceSlug, staleTime: Infinity },
  });
  const bareSlug = skillSlug.replace(/^(user|system|workspace)__/, '');
  const legacySkill = listQuery.data?.data.find(
    (skill) => slugify(skill.name) === bareSlug,
  );
  const existingSkill = skillId ? detailQuery.data : legacySkill;
  const scopeMatches =
    existingSkill?.ownerType !== 'workspace' ||
    (!!workspaceId && existingSkill.workspaceId === workspaceId);
  const targetIsValid =
    !!existingSkill && scopeMatches && !(isWorkspaceSlug && !skillId);
  const targetLookupComplete = skillId
    ? detailQuery.isFetched
    : isWorkspaceSlug || listQuery.isFetched;

  const mutation = useMutation({
    mutationFn: (data: EditSkillFromChatInput) => {
      if (!existingSkill || !targetIsValid) {
        throw new Error('Skill target is unavailable');
      }
      return skillsControllerUpdate(existingSkill.id, data);
    },
    onSuccess: (updatedSkill) => {
      onUpdated();
      showSuccess(t('chat.tools.edit_skill.success'));
      queryClient.setQueryData(
        getSkillsControllerFindOneQueryKey(updatedSkill.id),
        updatedSkill,
      );
      invalidateChatSkillQueries(queryClient, {
        threadId,
        workspaceId:
          existingSkill?.ownerType === 'workspace'
            ? existingSkill.workspaceId
            : undefined,
      });
    },
    onError: (error) => {
      try {
        const { code } = extractErrorData(error);
        showError(
          t(
            code === 'DUPLICATE_SKILL_NAME'
              ? 'chat.tools.edit_skill.errorDuplicate'
              : 'chat.tools.edit_skill.error',
          ),
        );
      } catch {
        showError(t('chat.tools.edit_skill.error'));
      }
    },
  });

  return {
    existingSkill,
    targetIsValid,
    targetLookupComplete,
    updateSkill: mutation.mutate,
    isPending: mutation.isPending,
  };
}
