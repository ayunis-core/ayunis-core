import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { showError, showSuccess } from '@/shared/lib/toast';
import {
  getWorkspaceContextControllerFindContextQueryKey,
  getWorkspaceContextControllerListKnowledgeBaseCandidatesQueryKey,
  getWorkspaceContextControllerListSkillCandidatesQueryKey,
  getWorkspacesControllerFindOneQueryKey,
  workspaceContextControllerAddDocument,
  workspaceContextControllerAttachKnowledgeBase,
  workspaceContextControllerAttachSkill,
  workspaceContextControllerDetachKnowledgeBase,
  workspaceContextControllerDetachSkill,
  workspaceContextControllerRemoveDocument,
  workspaceContextControllerUpdateInstruction,
} from '@/shared/api/generated/ayunisCoreAPI';

export function useWorkspaceContextActions(workspaceId: string) {
  const { t } = useTranslation('workspace');
  const queryClient = useQueryClient();
  const router = useRouter();

  const invalidateContext = () => {
    void queryClient.invalidateQueries({
      queryKey: getWorkspaceContextControllerFindContextQueryKey(workspaceId),
    });
    void queryClient.invalidateQueries({
      queryKey:
        getWorkspaceContextControllerListSkillCandidatesQueryKey(workspaceId),
    });
    void queryClient.invalidateQueries({
      queryKey:
        getWorkspaceContextControllerListKnowledgeBaseCandidatesQueryKey(
          workspaceId,
        ),
    });
    void router.invalidate();
  };

  const attachSkill = useMutation({
    mutationFn: (skillId: string) =>
      workspaceContextControllerAttachSkill(workspaceId, skillId),
    onError: () => showError(t('context.skills.attachError')),
  });

  const detachSkill = useMutation({
    mutationFn: (skillId: string) =>
      workspaceContextControllerDetachSkill(workspaceId, skillId),
    onSuccess: () => {
      invalidateContext();
      showSuccess(t('context.skills.detachSuccess'));
    },
    onError: () => showError(t('context.skills.detachError')),
  });

  const attachKnowledgeBase = useMutation({
    mutationFn: (knowledgeBaseId: string) =>
      workspaceContextControllerAttachKnowledgeBase(
        workspaceId,
        knowledgeBaseId,
      ),
    onError: () => showError(t('context.knowledge.attachError')),
  });

  const detachKnowledgeBase = useMutation({
    mutationFn: (knowledgeBaseId: string) =>
      workspaceContextControllerDetachKnowledgeBase(
        workspaceId,
        knowledgeBaseId,
      ),
    onSuccess: () => {
      invalidateContext();
      showSuccess(t('context.knowledge.detachSuccess'));
    },
    onError: () => showError(t('context.knowledge.detachError')),
  });

  const removeDocument = useMutation({
    mutationFn: (documentId: string) =>
      workspaceContextControllerRemoveDocument(workspaceId, documentId),
    onSuccess: () => {
      invalidateContext();
      showSuccess(t('context.documents.removeSuccess'));
    },
    onError: () => showError(t('context.documents.removeError')),
  });

  const uploadDocument = useMutation({
    mutationFn: (file: File) =>
      workspaceContextControllerAddDocument(workspaceId, { file }),
    onSuccess: () => {
      invalidateContext();
      showSuccess(t('context.documents.uploadSuccess'));
    },
    onError: () => showError(t('context.documents.uploadError')),
  });

  const updateInstruction = useMutation({
    mutationFn: (instruction: string | null) =>
      workspaceContextControllerUpdateInstruction(workspaceId, { instruction }),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: getWorkspacesControllerFindOneQueryKey(workspaceId),
      });
      invalidateContext();
      showSuccess(t('context.instructions.saveSuccess'));
    },
    onError: () => showError(t('context.instructions.saveError')),
  });

  async function attachSkills(skillIds: string[]) {
    try {
      await Promise.all(skillIds.map((id) => attachSkill.mutateAsync(id)));
      showSuccess(t('context.skills.attachSuccess'));
    } catch {
      // Error toast is handled by the mutation.
    } finally {
      invalidateContext();
    }
  }

  async function attachKnowledgeBases(knowledgeBaseIds: string[]) {
    try {
      await Promise.all(
        knowledgeBaseIds.map((id) => attachKnowledgeBase.mutateAsync(id)),
      );
      showSuccess(t('context.knowledge.attachSuccess'));
    } catch {
      // Error toast is handled by the mutation.
    } finally {
      invalidateContext();
    }
  }

  return {
    attachSkill: attachSkill.mutate,
    attachSkills,
    detachSkill: detachSkill.mutate,
    attachKnowledgeBase: attachKnowledgeBase.mutate,
    attachKnowledgeBases,
    detachKnowledgeBase: detachKnowledgeBase.mutate,
    removeDocument: removeDocument.mutate,
    uploadDocument: uploadDocument.mutate,
    updateInstruction: updateInstruction.mutate,
    isSavingInstruction: updateInstruction.isPending,
    isUploadingDocument: uploadDocument.isPending,
  };
}
