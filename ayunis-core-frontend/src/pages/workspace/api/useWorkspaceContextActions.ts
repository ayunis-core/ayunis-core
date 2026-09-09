import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import extractErrorData from '@/shared/api/extract-error-data';
import {
  getWorkspacesControllerFindOneQueryKey,
  skillsControllerActivate,
  skillsControllerCreate,
  skillsControllerDelete,
  skillsControllerPin,
  workspaceContextControllerUpdateInstruction,
} from '@/shared/api/generated/ayunisCoreAPI';
import type { CreateSkillDto } from '@/shared/api/generated/ayunisCoreAPI.schemas';
import { showError } from '@/shared/lib/toast';
import { useInvalidateWorkspaceResources } from './useInvalidateWorkspaceResources';

type WorkspaceSkillInput = Omit<
  CreateSkillDto,
  'ownerType' | 'workspaceId' | 'isActive'
>;

export function useWorkspaceContextActions(workspaceId: string) {
  const { t } = useTranslation(['skills', 'workspace']);
  const queryClient = useQueryClient();
  const invalidateContext = useInvalidateWorkspaceResources(workspaceId);

  const createSkill = useMutation({
    mutationFn: (data: WorkspaceSkillInput) =>
      skillsControllerCreate({
        ...data,
        ownerType: 'workspace',
        workspaceId,
      }),
    retry: 0,
    onSuccess: invalidateContext,
    onError: (error) => {
      try {
        const { code } = extractErrorData(error);
        showError(
          t(
            code === 'DUPLICATE_SKILL_NAME'
              ? 'create.duplicateName'
              : 'create.error',
          ),
        );
      } catch {
        showError(t('create.error'));
      }
    },
  });
  const deleteSkill = useMutation({
    mutationFn: (skillId: string) => skillsControllerDelete(skillId),
    onSuccess: invalidateContext,
    onError: () => showError(t('delete.error', { ns: 'skills' })),
  });
  const setSkillActive = useMutation({
    mutationFn: ({ skillId, isActive }: SkillActivationInput) =>
      skillsControllerActivate(skillId, { isActive }),
    onSuccess: invalidateContext,
    onError: () => showError(t('toggleActive.error', { ns: 'skills' })),
  });
  const setSkillPinned = useMutation({
    mutationFn: ({ skillId, isPinned }: SkillPinInput) =>
      skillsControllerPin(skillId, { isPinned }),
    onSuccess: invalidateContext,
    onError: () => showError(t('togglePinned.error', { ns: 'skills' })),
  });
  const updateInstruction = useMutation({
    mutationFn: (instruction: string | null) =>
      workspaceContextControllerUpdateInstruction(workspaceId, { instruction }),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: getWorkspacesControllerFindOneQueryKey(workspaceId),
      });
      void invalidateContext();
    },
    onError: () =>
      showError(t('context.instructions.saveError', { ns: 'workspace' })),
  });

  return {
    createSkill: createSkill.mutateAsync,
    deleteSkill: deleteSkill.mutate,
    setSkillActive: setSkillActive.mutate,
    setSkillPinned: setSkillPinned.mutate,
    isChangingSkillState: setSkillActive.isPending || setSkillPinned.isPending,
    updateInstruction: updateInstruction.mutateAsync,
    isSavingInstruction: updateInstruction.isPending,
  };
}

interface SkillActivationInput {
  skillId: string;
  isActive: boolean;
}

interface SkillPinInput {
  skillId: string;
  isPinned: boolean;
}
