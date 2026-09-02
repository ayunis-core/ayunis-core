import {
  getSuperAdminOrgsControllerGetAllOrgsQueryKey,
  getSuperAdminOrgsControllerGetOrgByIdQueryKey,
  useSuperAdminOrgsControllerUpdateOrg,
} from '@/shared/api';
import extractErrorData from '@/shared/api/extract-error-data';
import { setValidationErrors } from '@/shared/lib/set-validation-errors';
import { showError, showSuccess } from '@/shared/lib/toast';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import type { UseFormReturn } from 'react-hook-form';
import type { UpdateOrgNameFormData } from '@/pages/super-admin-settings/org/model/types';

interface UseSuperAdminUpdateOrgNameProps {
  orgId: string;
  form: UseFormReturn<UpdateOrgNameFormData>;
  onSuccess?: () => void;
}

export default function useSuperAdminUpdateOrgName({
  orgId,
  form,
  onSuccess,
}: UseSuperAdminUpdateOrgNameProps) {
  const { t } = useTranslation('super-admin-settings-org');
  const queryClient = useQueryClient();
  const router = useRouter();
  const { mutate, isPending } = useSuperAdminOrgsControllerUpdateOrg({
    mutation: {
      onSuccess: () => {
        showSuccess(t('orgDetails.rename.success'));
        void queryClient.invalidateQueries({
          queryKey: getSuperAdminOrgsControllerGetOrgByIdQueryKey(orgId),
        });
        void queryClient.invalidateQueries({
          queryKey: getSuperAdminOrgsControllerGetAllOrgsQueryKey(),
        });
        void router.invalidate();
        onSuccess?.();
      },
      onError: (error) => {
        try {
          const { code, errors } = extractErrorData(error);
          if (code === 'VALIDATION_ERROR' && errors) {
            setValidationErrors(form, errors, t, 'orgDetails.validation');
            return;
          }

          switch (code) {
            case 'ORG_NOT_FOUND':
              showError(t('orgDetails.rename.errorNotFound'));
              break;
            case 'ORG_UPDATE_FAILED':
              showError(t('orgDetails.rename.errorRejected'));
              break;
            default:
              showError(t('orgDetails.rename.error'));
          }
        } catch {
          showError(t('orgDetails.rename.error'));
        }
      },
    },
  });

  function updateOrgName(data: UpdateOrgNameFormData) {
    mutate({ id: orgId, data });
  }

  return { updateOrgName, isPending };
}
