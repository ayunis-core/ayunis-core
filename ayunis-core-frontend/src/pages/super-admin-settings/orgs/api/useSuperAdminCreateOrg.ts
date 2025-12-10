import {
  useSuperAdminOrgsControllerCreateOrg,
  type CreateOrgRequestDto,
} from '@/shared/api';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from '@tanstack/react-router';
import { getSuperAdminOrgsControllerGetAllOrgsQueryKey } from '@/shared/api';
import { useTranslation } from 'react-i18next';
import { showError, showSuccess } from '@/shared/lib/toast';

interface UseSuperAdminCreateOrgOptions {
  onSuccessCallback?: () => void;
}

export function useSuperAdminCreateOrg(
  options?: UseSuperAdminCreateOrgOptions,
) {
  const { t } = useTranslation('super-admin-settings-orgs');
  const queryClient = useQueryClient();
  const router = useRouter();
  const createOrgMutation = useSuperAdminOrgsControllerCreateOrg({
    mutation: {
      onSuccess: () => {
        // Invalidate the orgs list query
        void queryClient.invalidateQueries({
          queryKey: getSuperAdminOrgsControllerGetAllOrgsQueryKey(),
        });
        void router.invalidate();
        showSuccess(t('createOrg.success'));
        options?.onSuccessCallback?.();
      },
      onError: (err) => {
        console.error('Error creating organization', err);
        showError(t('createOrg.error'));
      },
    },
  });

  function createOrg(data: CreateOrgRequestDto) {
    createOrgMutation.mutate({
      data,
    });
  }

  return {
    createOrg,
    isLoading: createOrgMutation.isPending,
    isError: createOrgMutation.isError,
    error: createOrgMutation.error,
  };
}
