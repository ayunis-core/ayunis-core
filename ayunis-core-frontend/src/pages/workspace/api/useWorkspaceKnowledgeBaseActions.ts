import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  getKnowledgeBasesControllerFindOneQueryKey,
  knowledgeBasesControllerCreate,
  knowledgeBasesControllerDelete,
  knowledgeBasesControllerSetActivation,
  knowledgeBasesControllerUpdate,
} from '@/shared/api/generated/ayunisCoreAPI';
import extractErrorData from '@/shared/api/extract-error-data';
import { showError } from '@/shared/lib/toast';
import { useInvalidateWorkspaceResources } from './useInvalidateWorkspaceResources';

interface KnowledgeBaseFields {
  name: string;
  description?: string;
}

function errorKey(error: unknown, fallback: string, notFound?: string) {
  const { code } = extractErrorData(error);
  if (code === 'KNOWLEDGE_BASE_NOT_FOUND' && notFound) return notFound;
  return code === 'VALIDATION_ERROR' ? 'create.validationError' : fallback;
}

function useMutationError() {
  const { t } = useTranslation('knowledge-bases');
  return (error: unknown, fallback: string, notFound?: string) => {
    try {
      showError(t(errorKey(error, fallback, notFound)));
    } catch {
      showError(t(fallback));
    }
  };
}

function useCreateKnowledgeBase(workspaceId: string) {
  const invalidate = useInvalidateWorkspaceResources(workspaceId);
  const showMutationError = useMutationError();
  return useMutation({
    mutationFn: (data: KnowledgeBaseFields) =>
      knowledgeBasesControllerCreate({
        ownerType: 'workspace',
        workspaceId,
        name: data.name,
        description: data.description ?? '',
      }),
    retry: 0,
    onSuccess: invalidate,
    onError: (error) => showMutationError(error, 'create.error'),
  });
}

function useDeleteKnowledgeBase(workspaceId: string) {
  const invalidate = useInvalidateWorkspaceResources(workspaceId);
  const showMutationError = useMutationError();
  return useMutation({
    mutationFn: (knowledgeBaseId: string) =>
      knowledgeBasesControllerDelete(knowledgeBaseId),
    onSuccess: invalidate,
    onError: (error) =>
      showMutationError(error, 'delete.error', 'delete.notFound'),
  });
}

function useSetKnowledgeBaseActivation(workspaceId: string) {
  const queryClient = useQueryClient();
  const invalidate = useInvalidateWorkspaceResources(workspaceId);
  const showMutationError = useMutationError();
  return useMutation({
    mutationFn: ({
      knowledgeBaseId,
      isActive,
    }: {
      knowledgeBaseId: string;
      isActive: boolean;
    }) => knowledgeBasesControllerSetActivation(knowledgeBaseId, { isActive }),
    onSuccess: async (knowledgeBase) => {
      await queryClient.invalidateQueries({
        queryKey: getKnowledgeBasesControllerFindOneQueryKey(knowledgeBase.id),
      });
      await invalidate();
    },
    onError: (error) =>
      showMutationError(error, 'activation.error', 'activation.notFound'),
  });
}

function useUpdateKnowledgeBase(workspaceId: string) {
  const queryClient = useQueryClient();
  const invalidate = useInvalidateWorkspaceResources(workspaceId);
  const showMutationError = useMutationError();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: KnowledgeBaseFields }) =>
      knowledgeBasesControllerUpdate(id, data),
    onSuccess: async (knowledgeBase) => {
      await queryClient.invalidateQueries({
        queryKey: getKnowledgeBasesControllerFindOneQueryKey(knowledgeBase.id),
      });
      await invalidate();
    },
    onError: (error) =>
      showMutationError(error, 'detail.update.error', 'delete.notFound'),
  });
}

export function useWorkspaceKnowledgeBaseActions(workspaceId: string) {
  const create = useCreateKnowledgeBase(workspaceId);
  const remove = useDeleteKnowledgeBase(workspaceId);
  const setActivation = useSetKnowledgeBaseActivation(workspaceId);
  const update = useUpdateKnowledgeBase(workspaceId);
  return {
    createKnowledgeBase: create.mutateAsync,
    deleteKnowledgeBase: remove.mutate,
    setKnowledgeBaseActive: setActivation.mutate,
    isChangingKnowledgeBaseState: setActivation.isPending,
    updateKnowledgeBase: (id: string, data: KnowledgeBaseFields) =>
      update.mutateAsync({ id, data }),
  };
}
