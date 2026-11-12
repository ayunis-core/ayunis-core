import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import {
  ownerChangeErrorKey,
  type OwnerSelection,
} from '@/features/resource-ownership';
import {
  getRecordingsControllerFindAllQueryKey,
  getRecordingsControllerFindOneQueryKey,
  recordingsControllerChangeOwner,
} from '@/shared/api/generated/ayunisCoreAPI';
import { showError, showSuccess } from '@/shared/lib/toast';

export function useChangeRecordingOwner(recordingId: string) {
  const { t } = useTranslation('ownership');
  const queryClient = useQueryClient();
  const router = useRouter();

  const mutation = useMutation({
    mutationFn: (owner: OwnerSelection) =>
      recordingsControllerChangeOwner(recordingId, owner),
    onSuccess: async () => {
      await Promise.all(
        [
          getRecordingsControllerFindAllQueryKey(),
          getRecordingsControllerFindOneQueryKey(recordingId),
        ].map((queryKey) => queryClient.invalidateQueries({ queryKey })),
      );
      await router.invalidate();
      showSuccess(t('change.success'));
    },
    onError: (error) => {
      showError(t(ownerChangeErrorKey(error)));
    },
  });

  return { changeOwner: mutation.mutateAsync };
}
