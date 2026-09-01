import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import type {
  CreateWorkspaceKnowledgeBaseDto,
  CreateWorkspaceSkillDto,
} from '@/shared/api/generated/ayunisCoreAPI.schemas';
import {
  getWorkspaceContextControllerFindContextQueryKey,
  getWorkspaceContextControllerListDocumentsQueryKey,
  getWorkspaceContextControllerListKnowledgeBasesQueryKey,
  getWorkspaceContextControllerListSkillsQueryKey,
  getWorkspacesControllerFindOneQueryKey,
  workspaceContextControllerAddDocument,
  workspaceContextControllerCopyPersonalSkill,
  workspaceContextControllerCreateKnowledgeBase,
  workspaceContextControllerCreateSkill,
  workspaceContextControllerDeleteKnowledgeBase,
  workspaceContextControllerDeleteSkill,
  workspaceContextControllerRemoveDocument,
  workspaceContextControllerUpdateInstruction,
} from '@/shared/api/generated/ayunisCoreAPI';
import { showError, showSuccess } from '@/shared/lib/toast';

export function useWorkspaceContextActions(workspaceId: string) {
  const { t } = useTranslation('workspace');
  const queryClient = useQueryClient();
  const router = useRouter();
  const invalidateContext = () => {
    for (const queryKey of [
      getWorkspaceContextControllerFindContextQueryKey(workspaceId),
      getWorkspaceContextControllerListSkillsQueryKey(workspaceId),
      getWorkspaceContextControllerListKnowledgeBasesQueryKey(workspaceId),
      getWorkspaceContextControllerListDocumentsQueryKey(workspaceId),
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
  const copySkill = useMutation({
    mutationFn: (skillId: string) =>
      workspaceContextControllerCopyPersonalSkill(workspaceId, { skillId }),
  });
  const deleteSkill = useMutation({
    mutationFn: (skillId: string) =>
      workspaceContextControllerDeleteSkill(workspaceId, skillId),
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
  const removeDocument = useMutation({
    mutationFn: (documentId: string) =>
      workspaceContextControllerRemoveDocument(workspaceId, documentId),
    onSuccess: invalidateContext,
  });
  const uploadDocument = useMutation({
    mutationFn: (file: File) =>
      workspaceContextControllerAddDocument(workspaceId, { file }),
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

  async function copySkills(skillIds: string[]) {
    const results = await Promise.allSettled(
      skillIds.map((id) => copySkill.mutateAsync(id)),
    );
    invalidateContext();
    if (results.some(({ status }) => status === 'rejected')) {
      showError(t('context.skills.copyError'));
      throw new Error('Failed to copy one or more skills');
    }
    showSuccess(t('context.skills.copySuccess'));
  }

  return {
    createSkill: createSkill.mutateAsync,
    copySkills,
    deleteSkill: deleteSkill.mutate,
    createKnowledgeBase: createKnowledgeBase.mutateAsync,
    deleteKnowledgeBase: deleteKnowledgeBase.mutate,
    removeDocument: removeDocument.mutate,
    uploadDocument: uploadDocument.mutate,
    updateInstruction: updateInstruction.mutateAsync,
    isSavingInstruction: updateInstruction.isPending,
    isUploadingDocument: uploadDocument.isPending,
  };
}
