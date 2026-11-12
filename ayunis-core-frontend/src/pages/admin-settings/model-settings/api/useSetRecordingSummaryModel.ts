import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  getRecordingSummaryModelControllerGetRecordingSummaryModelQueryKey,
  useRecordingSummaryModelControllerSetRecordingSummaryModel,
} from '@/shared/api';
import extractErrorData from '@/shared/api/extract-error-data';
import { showError, showSuccess } from '@/shared/lib/toast';

const ERROR_MAP: Record<string, string> = {
  MODEL_NOT_FOUND: 'models.recordingSummaryModel.notPermitted',
  RECORDING_SUMMARY_MODEL_ANONYMOUS_ONLY:
    'models.recordingSummaryModel.anonymousOnly',
};

export function useSetRecordingSummaryModel() {
  const { t } = useTranslation('admin-settings-models');
  const queryClient = useQueryClient();
  const queryKey =
    getRecordingSummaryModelControllerGetRecordingSummaryModelQueryKey();

  const mutation = useRecordingSummaryModelControllerSetRecordingSummaryModel({
    mutation: {
      onSuccess: (data) => {
        queryClient.setQueryData(queryKey, data);
        showSuccess(t('models.recordingSummaryModel.success'));
      },
      onError: (error) => {
        try {
          const { code } = extractErrorData(error);
          showError(t(ERROR_MAP[code] ?? 'models.recordingSummaryModel.error'));
        } catch {
          showError(t('models.recordingSummaryModel.error'));
        }
      },
      onSettled: () => {
        void queryClient.invalidateQueries({ queryKey });
      },
    },
  });

  function setRecordingSummaryModel(permittedModelId: string | null) {
    mutation.mutate({ data: { permittedModelId } });
  }

  return { setRecordingSummaryModel, isSaving: mutation.isPending };
}
