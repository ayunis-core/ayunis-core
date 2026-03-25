import {
  getThreadsControllerFindOneQueryKey,
  threadSourcesControllerAddFileSource,
} from '@/shared/api';
import type { ThreadSourcesControllerAddFileSourceBody } from '@/shared/api/generated/ayunisCoreAPI.schemas';
import extractErrorData from '@/shared/api/extract-error-data';
import { showError } from '@/shared/lib/toast';
import { useTranslation } from 'react-i18next';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from '@tanstack/react-router';

interface UseFileSourceProps {
  threadId?: string;
}

interface UploadFileParams {
  file: File;
  name?: string;
  description?: string;
}

export function useCreateFileSource({ threadId }: UseFileSourceProps = {}) {
  const { t } = useTranslation('common');
  const router = useRouter();
  const queryClient = useQueryClient();
  const createFileSourceMutation = useMutation({
    retry: 0,
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: ThreadSourcesControllerAddFileSourceBody;
    }) => threadSourcesControllerAddFileSource(id, data),
    onError: (error: unknown) => {
      console.error('Failed to create file source:', error);
      try {
        const { code } = extractErrorData(error);
        switch (code) {
          case 'INVALID_FILE_TYPE':
          case 'UNSUPPORTED_FILE_TYPE':
            showError(t('chatInput.invalidFileTypeError'));
            break;
          case 'EMPTY_FILE_DATA':
            showError(t('chatInput.fileSourceEmptyDataError'));
            break;
          case 'FILE_TOO_LARGE':
            showError(t('chatInput.fileSourceTooLargeError'));
            break;
          case 'SERVICE_BUSY':
            showError(t('chatInput.fileSourceServiceBusyError'));
            break;
          case 'SERVICE_TIMEOUT':
            showError(t('chatInput.fileSourceTimeoutError'));
            break;
          default:
            showError(t('chatInput.fileSourceUploadError'));
            break;
        }
      } catch {
        // Non-AxiosError (network failure, request cancellation, etc.)
        showError(t('chatInput.fileSourceUploadError'));
      }
    },
    onSettled: () => {
      if (!threadId) return;
      void queryClient.invalidateQueries({
        queryKey: getThreadsControllerFindOneQueryKey(threadId),
      });
      void router.invalidate();
    },
  });

  function createFileSource({ file, name, description }: UploadFileParams) {
    if (!threadId) {
      console.error('Thread ID is required');
      showError('Thread ID is required');
      return;
    }

    const data: ThreadSourcesControllerAddFileSourceBody = {
      file,
      name: name ?? file.name,
      description,
    };

    createFileSourceMutation.mutate({ id: threadId, data });
  }

  function createFileSourceAsync({
    file,
    name,
    description,
  }: UploadFileParams) {
    if (!threadId) {
      console.error('Thread ID is required');
      showError('Thread ID is required');
      return;
    }

    const data: ThreadSourcesControllerAddFileSourceBody = {
      file,
      name: name ?? file.name,
      description,
    };

    return createFileSourceMutation.mutateAsync({ id: threadId, data });
  }

  return {
    createFileSource,
    createFileSourceAsync,
    isLoading: createFileSourceMutation.isPending,
    error: createFileSourceMutation.error,
    reset: createFileSourceMutation.reset,
  };
}
