import {
  useAcademyAccessControllerGetOrgSettings,
  useAcademyAccessControllerUpsertOrgSettings,
  getAcademyAccessControllerGetOrgSettingsQueryKey,
  getAcademyAccessControllerGetStatusQueryKey,
  getAcademyAccessControllerListOrgCertificatesQueryKey,
} from '@/shared/api/generated/ayunisCoreAPI';
import { AcademyAccessMode } from '@/shared/api/generated/ayunisCoreAPI.schemas';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from '@tanstack/react-router';
import { showSuccess, showError } from '@/shared/lib/toast';
import { useTranslation } from 'react-i18next';
import extractErrorData from '@/shared/api/extract-error-data';

export function useAcademyAccessOrgSettings() {
  const { t } = useTranslation('admin-settings-academy');
  const queryClient = useQueryClient();
  const router = useRouter();
  const queryKey = getAcademyAccessControllerGetOrgSettingsQueryKey();

  const { data, isLoading, isError, refetch } =
    useAcademyAccessControllerGetOrgSettings();

  const updateMutation = useAcademyAccessControllerUpsertOrgSettings({
    mutation: {
      onSuccess: () => {
        showSuccess(t('requirement.saved'));
      },
      onError: (error: unknown) => {
        try {
          const { code } = extractErrorData(error);
          showError(
            code === 'ACADEMY_ACCESS_UNEXPECTED_ERROR'
              ? t('requirement.errorUnexpected')
              : t('requirement.error'),
          );
        } catch {
          showError(t('requirement.error'));
        }
      },
      onSettled: async () => {
        await queryClient.invalidateQueries({ queryKey });
        // An admin who switches the org into a required mode without holding a
        // certificate is gated too, so their own status has to re-evaluate.
        await queryClient.invalidateQueries({
          queryKey: getAcademyAccessControllerGetStatusQueryKey(),
        });
        // The overview's validity statuses are derived server-side from the
        // mode, so they are stale the moment it changes. Both the cached pages
        // and the route loader that reads them have to go.
        await queryClient.invalidateQueries({
          queryKey: getAcademyAccessControllerListOrgCertificatesQueryKey(),
        });
        await router.invalidate();
      },
    },
  });

  function setMode(mode: AcademyAccessMode) {
    updateMutation.mutate({ data: { mode } });
  }

  return {
    mode: data?.mode ?? AcademyAccessMode.unrestricted,
    isLoading,
    isError,
    refetch,
    isUpdating: updateMutation.isPending,
    setMode,
  };
}
