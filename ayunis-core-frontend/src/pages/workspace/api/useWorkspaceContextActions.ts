import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from '@tanstack/react-router';
import type {
  CreateWorkspaceKnowledgeBaseDto,
  CreateWorkspaceSkillDto,
} from '@/shared/api/generated/ayunisCoreAPI.schemas';
import {
  getWorkspaceContextControllerFindContextQueryKey,
  getWorkspaceContextControllerListKnowledgeBasesQueryKey,
  getWorkspaceContextControllerListSkillsQueryKey,
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
  const queryClient = useQueryClient();
  const router = useRouter();
  const invalidateContext = () => {
    for (const queryKey of [
      getWorkspaceContextControllerFindContextQueryKey(workspaceId),
      getWorkspaceContextControllerListSkillsQueryKey(workspaceId),
      getWorkspaceContextControllerListKnowledgeBasesQueryKey(workspaceId),
    ]) {
      void queryClient.invalidateQueries({ queryKey });
    }
    void router.invalidate();
  };

  const createSkill = useMutation({
    mutationFn: (data: CreateWorkspaceSkillDto) =>
      workspaceContextControllerCreateSkill(workspaceId, data),
    onSuccess: invalidateContext,
  });
  const deleteSkill = useMutation({
    mutationFn: (skillId: string) =>
      workspaceContextControllerDeleteSkill(workspaceId, skillId),
    onSuccess: invalidateContext,
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
  });
  const createKnowledgeBase = useMutation({
    mutationFn: (data: CreateWorkspaceKnowledgeBaseDto) =>
      workspaceContextControllerCreateKnowledgeBase(workspaceId, data),
    onSuccess: invalidateContext,
  });
  const deleteKnowledgeBase = useMutation({
    mutationFn: (knowledgeBaseId: string) =>
      workspaceContextControllerDeleteKnowledgeBase(
        workspaceId,
        knowledgeBaseId,
      ),
    onSuccess: invalidateContext,
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
  });
  const updateInstruction = useMutation({
    mutationFn: (instruction: string | null) =>
      workspaceContextControllerUpdateInstruction(workspaceId, { instruction }),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: getWorkspacesControllerFindOneQueryKey(workspaceId),
      });
      invalidateContext();
    },
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
