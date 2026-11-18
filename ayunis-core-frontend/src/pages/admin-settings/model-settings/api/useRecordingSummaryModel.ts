import {
  getRecordingSummaryModelControllerGetRecordingSummaryModelQueryKey,
  useRecordingSummaryModelControllerGetRecordingSummaryModel,
} from '@/shared/api';

export function useRecordingSummaryModel() {
  const { data, isLoading, error } =
    useRecordingSummaryModelControllerGetRecordingSummaryModel({
      query: {
        queryKey:
          getRecordingSummaryModelControllerGetRecordingSummaryModelQueryKey(),
      },
    });

  return {
    permittedModelId: data?.permittedLanguageModel?.id ?? null,
    isLoading,
    error,
  };
}
