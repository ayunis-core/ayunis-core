import { useTranslation } from 'react-i18next';
import { showError } from '@/shared/lib/toast';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import extractErrorData from '@/shared/api/extract-error-data';
import { useInvalidateWorkspaceResources } from './useInvalidateWorkspaceResources';
import type {
  CreateWorkspaceKnowledgeBaseDto,
  CreateWorkspaceSkillDto,
} from '@/shared/api/generated/ayunisCoreAPI.schemas';
import {
  getWorkspacesControllerFindOneQueryKey,
  workspaceContextControllerCreateKnowledgeBase,
  workspaceContextControllerCreateSkill,
  workspaceContextControllerDeleteKnowledgeBase,
  workspaceContextControllerDeleteSkill,
  workspaceContextControllerSetKnowledgeBaseActivation,
  workspaceContextControllerSetSkillActivation,
  workspaceContextControllerSetSkillPin,
  workspaceContextControllerUpdateInstruction,
} from '@/shared/api/generated/ayunisCoreAPI';
export function useWorkspaceContextActions(workspaceId: string) {
  const { t } = useTranslation(['skills', 'knowledge-bases', 'workspace']);
  const queryClient = useQueryClient();
  const invalidateContext = useInvalidateWorkspaceResources(workspaceId);

  const createSkill = useMutation({
    mutationFn: (data: CreateWorkspaceSkillDto) =>
      workspaceContextControllerCreateSkill(workspaceId, data),
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
    mutationFn: (skillId: string) =>
      workspaceContextControllerDeleteSkill(workspaceId, skillId),
    onSuccess: invalidateContext,
    onError: () => showError(t('delete.error', { ns: 'skills' })),
  });
  const setSkillActive = useMutation({
    mutationFn: ({
      skillId,
      isActive,
    }: {
      skillId: string;
      isActive: boolean;
    }) =>
      workspaceContextControllerSetSkillActivation(workspaceId, skillId, {
        isActive,
      }),
    onSuccess: invalidateContext,
    onError: () => showError(t('toggleActive.error', { ns: 'skills' })),
  });
  const setSkillPinned = useMutation({
    mutationFn: ({
      skillId,
      isPinned,
    }: {
      skillId: string;
      isPinned: boolean;
    }) =>
      workspaceContextControllerSetSkillPin(workspaceId, skillId, { isPinned }),
    onSuccess: invalidateContext,
    onError: () => showError(t('togglePinned.error', { ns: 'skills' })),
  });
  const createKnowledgeBase = useMutation({
    mutationFn: (data: CreateWorkspaceKnowledgeBaseDto) =>
      workspaceContextControllerCreateKnowledgeBase(workspaceId, data),
    retry: 0,
    onSuccess: invalidateContext,
    onError: () => showError(t('create.error', { ns: 'knowledge-bases' })),
  });
  const deleteKnowledgeBase = useMutation({
    mutationFn: (knowledgeBaseId: string) =>
      workspaceContextControllerDeleteKnowledgeBase(
        workspaceId,
        knowledgeBaseId,
      ),
    onSuccess: invalidateContext,
    onError: () => showError(t('delete.error', { ns: 'knowledge-bases' })),
  });
  const setKnowledgeBaseActive = useMutation({
    mutationFn: ({
      knowledgeBaseId,
      isActive,
    }: {
      knowledgeBaseId: string;
      isActive: boolean;
    }) =>
      workspaceContextControllerSetKnowledgeBaseActivation(
        workspaceId,
        knowledgeBaseId,
        { isActive },
      ),
    onSuccess: invalidateContext,
    onError: () => showError(t('activation.error', { ns: 'knowledge-bases' })),
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
    createKnowledgeBase: createKnowledgeBase.mutateAsync,
    deleteKnowledgeBase: deleteKnowledgeBase.mutate,
    setKnowledgeBaseActive: setKnowledgeBaseActive.mutate,
    isChangingKnowledgeBaseState: setKnowledgeBaseActive.isPending,
    updateInstruction: updateInstruction.mutateAsync,
    isSavingInstruction: updateInstruction.isPending,
  };
}
