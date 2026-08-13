import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import type { UseFormReturn } from 'react-hook-form';
import {
  useWorkspacesControllerCreate,
  getWorkspacesControllerFindAllQueryKey,
} from '@/shared/api/generated/ayunisCoreAPI';
import type { WorkspaceResponseDto } from '@/shared/api/generated/ayunisCoreAPI.schemas';
import extractErrorData from '@/shared/api/extract-error-data';
import { setValidationErrors } from '@/shared/lib/set-validation-errors';
import { showError, showSuccess } from '@/shared/lib/toast';
import type { WorkspaceFormData } from '@/widgets/workspace-form-dialog';

export function useCreateWorkspace(
  form: UseFormReturn<WorkspaceFormData>,
  onSuccess?: (workspace: WorkspaceResponseDto) => void,
) {
  const { t } = useTranslation('workspaces');
  const queryClient = useQueryClient();
  const router = useRouter();

  const mutation = useWorkspacesControllerCreate({
    mutation: {
      onSuccess: (workspace) => {
        showSuccess(t('toast.createSuccess'));
        onSuccess?.(workspace);
      },
      onError: (error: unknown) => {
        try {
          const { code, errors } = extractErrorData(error);
          if (code === 'VALIDATION_ERROR' && errors) {
            setValidationErrors(form, errors, t, 'validation');
          } else if (code === 'WORKSPACE_INVALID_NAME') {
            form.setError('name', { message: t('validation.name.invalid') });
          } else {
            showError(t('toast.createError'));
          }
        } catch {
          showError(t('toast.createError'));
        }
      },
      onSettled: async () => {
        await queryClient.invalidateQueries({
          queryKey: getWorkspacesControllerFindAllQueryKey(),
        });
        await router.invalidate();
      },
    },
  });

  function createWorkspace(data: WorkspaceFormData) {
    mutation.mutate({
      data: {
        name: data.name.trim(),
        description: data.description.trim() || undefined,
        icon: data.icon,
        color: data.color,
      },
    });
  }

  return { createWorkspace, isCreating: mutation.isPending };
}
