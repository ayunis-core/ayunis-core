import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from '@tanstack/react-router';
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
  workspaceContextControllerCreateKnowledgeBase,
  workspaceContextControllerCreateSkill,
  workspaceContextControllerDeleteKnowledgeBase,
  workspaceContextControllerDeleteSkill,
  workspaceContextControllerRemoveDocument,
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

  return {
    createSkill: createSkill.mutateAsync,
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
