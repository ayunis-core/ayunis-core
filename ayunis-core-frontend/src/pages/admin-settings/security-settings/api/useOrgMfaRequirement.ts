import {
  useMfaControllerGetOrgRequirement,
  useMfaControllerUpdateOrgRequirement,
  getMfaControllerGetOrgRequirementQueryKey,
} from '@/shared/api/generated/ayunisCoreAPI';
import { useQueryClient } from '@tanstack/react-query';
import { showSuccess, showError } from '@/shared/lib/toast';
import { useTranslation } from 'react-i18next';

export function useOrgMfaRequirement() {
  const { t } = useTranslation('admin-settings-security');
  const queryClient = useQueryClient();
  const queryKey = getMfaControllerGetOrgRequirementQueryKey();

  const { data, isLoading, isError, refetch } =
    useMfaControllerGetOrgRequirement();

  const updateMutation = useMfaControllerUpdateOrgRequirement({
    mutation: {
      onSuccess: () => {
        showSuccess(t('mfaRequirement.saved'));
      },
      onError: () => {
        showError(t('mfaRequirement.error'));
      },
      onSettled: async () => {
        await queryClient.invalidateQueries({ queryKey });
      },
    },
  });

  function setRequired(required: boolean) {
    updateMutation.mutate({ data: { required } });
  }

  return {
    required: data?.required ?? false,
    isLoading,
    isError,
    refetch,
    isUpdating: updateMutation.isPending,
    setRequired,
  };
}
