import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import {
  getRecordingsControllerFindAllQueryKey,
  recordingsControllerCreate,
} from '@/shared/api/generated/ayunisCoreAPI';
import extractErrorData from '@/shared/api/extract-error-data';
import { personalRecordingListParams } from '@/shared/api/recording-scopes';
import { useUploadNewRecordingAudio } from '@/features/recording-audio';
import { showError, showSuccess } from '@/shared/lib/toast';
import type { CreateRecordingSubmission } from '@/widgets/resource-create-dialog';

const ERROR_KEYS: Record<string, string> = {
  VALIDATION_ERROR: 'create.validationError',
  UNAUTHORIZED_ACCESS: 'create.noPermission',
};

export function useCreateRecording() {
  const { t } = useTranslation('recordings');
  const queryClient = useQueryClient();
  const router = useRouter();
  const uploadAudio = useUploadNewRecordingAudio();

  const mutation = useMutation({
    mutationFn: async (data: CreateRecordingSubmission) => {
      const recording = await recordingsControllerCreate({
        ...(data.owner ?? { ownerType: 'personal' }),
        name: data.name,
      });
      await uploadAudio(recording.id, data.file);
      return recording;
    },
    onSuccess: (recording) => {
      void queryClient.invalidateQueries({
        queryKey: getRecordingsControllerFindAllQueryKey(
          personalRecordingListParams,
        ),
      });
      void router.navigate({
        to: '/recordings/$id',
        params: { id: recording.id },
      });
      showSuccess(t('create.success'));
    },
    onError: (error) => {
      try {
        const { code } = extractErrorData(error);
        showError(t(ERROR_KEYS[code] ?? 'create.error'));
      } catch {
        showError(t('create.error'));
      }
    },
  });

  return { createRecording: mutation.mutateAsync };
}
