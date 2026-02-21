import extractErrorData from '@/shared/api/extract-error-data';
import { useQueryClient } from '@tanstack/react-query';
import { showSuccess, showError } from '@/shared/lib/toast';
import { useTranslation } from 'react-i18next';
import type { SourcesHook, Source } from '../ui/KnowledgeBaseCard';

interface UseGetEntitySources {
  (entityId: string): { data?: Source[]; isLoading: boolean };
}

interface UseAddFileSource {
  (options: {
    mutation: {
      retry?: number;
      onSuccess: () => void;
      onError: (error: unknown) => void;
    };
  }): {
    mutate: (params: { id: string; data: { file: File } }) => void;
    isPending: boolean;
  };
}

interface RemoveSourceMutation<TParams> {
  mutate: (params: TParams) => void;
  isPending: boolean;
}

interface UseRemoveSource<TParams> {
  (options: {
    mutation: {
      onSuccess: () => void;
      onError: () => void;
    };
  }): RemoveSourceMutation<TParams>;
}

interface EntitySourcesHooks<TRemoveParams> {
  useGetEntitySources: UseGetEntitySources;
  useAddFileSource: UseAddFileSource;
  useRemoveSource: UseRemoveSource<TRemoveParams>;
}

export function createEntitySourcesHook<
  TRemoveParams extends Record<string, string>,
>(
  hooks: EntitySourcesHooks<TRemoveParams>,
  config: {
    queryKeyPrefix: string;
    buildRemoveParams: (entityId: string, sourceId: string) => TRemoveParams;
  },
) {
  return function useEntitySources({
    entity,
    translationNamespace,
  }: {
    entity: { id: string };
    translationNamespace: string;
  }): SourcesHook {
    const { t } = useTranslation(translationNamespace);
    const queryClient = useQueryClient();

    const { data: sources = [], isLoading: isLoadingSources } =
      hooks.useGetEntitySources(entity.id);

    const addFileSourceMutation = hooks.useAddFileSource({
      mutation: {
        retry: 0,
        onSuccess: () => {
          void queryClient.invalidateQueries({
            queryKey: [`${config.queryKeyPrefix}/${entity.id}/sources`],
          });
          showSuccess(t('sources.addedSuccessfully'));
        },
        onError: (error: unknown) => {
          try {
            const { code } = extractErrorData(error);
            switch (code) {
              case 'INVALID_FILE_TYPE':
              case 'UNSUPPORTED_FILE_TYPE':
                showError(t('sources.invalidFileTypeError'));
                break;
              case 'EMPTY_FILE_DATA':
                showError(t('sources.fileSourceEmptyDataError'));
                break;
              case 'FILE_TOO_LARGE':
                showError(t('sources.fileSourceTooLargeError'));
                break;
              case 'TOO_MANY_PAGES':
                showError(t('sources.fileSourceTooManyPagesError'));
                break;
              case 'SERVICE_BUSY':
                showError(t('sources.fileSourceServiceBusyError'));
                break;
              case 'SERVICE_TIMEOUT':
                showError(t('sources.fileSourceTimeoutError'));
                break;
              default:
                showError(t('sources.failedToAdd'));
            }
          } catch {
            showError(t('sources.failedToAdd'));
          }
        },
      },
    });

    const removeSourceMutation = hooks.useRemoveSource({
      mutation: {
        onSuccess: () => {
          void queryClient.invalidateQueries({
            queryKey: [`${config.queryKeyPrefix}/${entity.id}/sources`],
          });
          showSuccess(t('sources.removedSuccessfully'));
        },
        onError: () => {
          showError(t('sources.failedToRemove'));
        },
      },
    });

    function removeFileSource(sourceId: string) {
      removeSourceMutation.mutate(
        config.buildRemoveParams(entity.id, sourceId),
      );
    }

    return {
      sources,
      isLoadingSources,
      addFileSource: addFileSourceMutation.mutate,
      addFileSourcePending: addFileSourceMutation.isPending,
      removeSource: removeFileSource,
      removeSourcePending: removeSourceMutation.isPending,
    };
  };
}
