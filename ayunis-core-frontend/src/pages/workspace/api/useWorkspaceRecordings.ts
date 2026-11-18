import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  getRecordingsControllerFindAllQueryKey,
  recordingsControllerCreate,
  recordingsControllerDelete,
  useRecordingsControllerFindAll,
} from '@/shared/api/generated/ayunisCoreAPI';
import extractErrorData from '@/shared/api/extract-error-data';
import { workspaceRecordingListParams } from '@/shared/api/recording-scopes';
import { showError, showSuccess } from '@/shared/lib/toast';
import { useUploadNewRecordingAudio } from '@/features/recording-audio';

export function useWorkspaceRecordings(workspaceId: string, enabled: boolean) {
  const query = useRecordingsControllerFindAll(
    workspaceRecordingListParams(workspaceId),
    { query: { enabled } },
  );
  return {
    recordings: query.data?.data ?? [],
    isLoading: query.isLoading,
  };
}

function useShowError() {
  const { t } = useTranslation('recordings');
  return (error: unknown, keys: Record<string, string>, fallback: string) => {
    try {
      const { code } = extractErrorData(error);
      showError(t(keys[code] ?? fallback));
    } catch {
      showError(t(fallback));
    }
  };
}

export function useWorkspaceRecordingActions(workspaceId: string) {
  const { t } = useTranslation('recordings');
  const queryClient = useQueryClient();
  const showMutationError = useShowError();
  const uploadAudio = useUploadNewRecordingAudio();
  const invalidate = () =>
    queryClient.invalidateQueries({
      queryKey: getRecordingsControllerFindAllQueryKey(
        workspaceRecordingListParams(workspaceId),
      ),
    });

  const create = useMutation({
    mutationFn: async ({ name, file }: { name: string; file: File }) => {
      const recording = await recordingsControllerCreate({
        ownerType: 'workspace',
        workspaceId,
        name,
      });
      await uploadAudio(recording.id, file);
      return recording;
    },
    onSuccess: async () => {
      await invalidate();
      showSuccess(t('create.success'));
    },
    onError: (error) =>
      showMutationError(
        error,
        {
          VALIDATION_ERROR: 'create.validationError',
          UNAUTHORIZED_ACCESS: 'create.noPermission',
        },
        'create.error',
      ),
  });

  const remove = useMutation({
    mutationFn: (recordingId: string) =>
      recordingsControllerDelete(recordingId),
    onSuccess: async () => {
      await invalidate();
      showSuccess(t('delete.success'));
    },
    onError: (error) =>
      showMutationError(
        error,
        {
          RECORDING_NOT_FOUND: 'delete.notFound',
          UNAUTHORIZED_ACCESS: 'delete.noPermission',
        },
        'delete.error',
      ),
  });

  return {
    createRecording: create.mutateAsync,
    deleteRecording: remove.mutate,
    isDeleting: remove.isPending,
  };
}
