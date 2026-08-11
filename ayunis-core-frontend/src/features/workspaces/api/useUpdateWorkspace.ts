import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import type { UseFormReturn } from 'react-hook-form';
import {
  useWorkspacesControllerUpdate,
  getWorkspacesControllerFindAllQueryKey,
  getWorkspacesControllerFindOneQueryKey,
} from '@/shared/api/generated/ayunisCoreAPI';
import extractErrorData from '@/shared/api/extract-error-data';
import { setValidationErrors } from '@/shared/lib/set-validation-errors';
import { showError, showSuccess } from '@/shared/lib/toast';
import type { WorkspaceFormData } from '../model/types';

export function useUpdateWorkspace(
  workspaceId: string,
  form: UseFormReturn<WorkspaceFormData>,
  onSuccess?: () => void,
) {
  const { t } = useTranslation('workspaces');
  const queryClient = useQueryClient();
  const router = useRouter();

  const mutation = useWorkspacesControllerUpdate({
    mutation: {
      onSuccess: () => {
        showSuccess(t('toast.updateSuccess'));
        onSuccess?.();
      },
      onError: (error: unknown) => {
        try {
          const { code, errors } = extractErrorData(error);
          if (code === 'VALIDATION_ERROR' && errors) {
            setValidationErrors(form, errors, t, 'validation');
          } else if (code === 'WORKSPACE_INVALID_NAME') {
            form.setError('name', { message: t('validation.name.invalid') });
          } else if (code === 'WORKSPACE_NOT_FOUND') {
            showError(t('toast.notFound'));
          } else {
            showError(t('toast.updateError'));
          }
        } catch {
          showError(t('toast.updateError'));
        }
      },
      onSettled: async () => {
        await queryClient.invalidateQueries({
          queryKey: getWorkspacesControllerFindAllQueryKey(),
        });
        await queryClient.invalidateQueries({
          queryKey: getWorkspacesControllerFindOneQueryKey(workspaceId),
        });
        await router.invalidate();
      },
    },
  });

  function updateWorkspace(data: WorkspaceFormData) {
    mutation.mutate({
      id: workspaceId,
      data: {
        name: data.name.trim(),
        description: data.description.trim() || null,
        icon: data.icon,
        color: data.color,
      },
    });
  }

  return { updateWorkspace, isUpdating: mutation.isPending };
}
