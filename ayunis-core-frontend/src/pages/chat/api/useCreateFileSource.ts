import {
  getThreadsControllerFindOneQueryKey,
  threadSourcesControllerAddFileSource,
} from '@/shared/api';
import type { ThreadSourcesControllerAddFileSourceBody } from '@/shared/api/generated/ayunisCoreAPI.schemas';
import handleSourceUploadError from '@/shared/lib/handle-source-upload-error';
import { useTranslation } from 'react-i18next';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from '@tanstack/react-router';

const UPLOAD_TIMEOUT_MS = 300_000;

interface UseFileSourceProps {
  threadId?: string;
}

interface UploadFileParams {
  file: File;
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
    }) =>
      threadSourcesControllerAddFileSource(
        id,
        data,
        AbortSignal.timeout(UPLOAD_TIMEOUT_MS),
      ),
    onError: (error: unknown) => {
      handleSourceUploadError(error, t);
    },
    onSettled: () => {
      if (!threadId) return;
      void queryClient.invalidateQueries({
        queryKey: getThreadsControllerFindOneQueryKey(threadId),
      });
      void router.invalidate();
    },
  });

  function createFileSource({ file }: UploadFileParams) {
    if (!threadId) {
      console.error('Thread ID is required');
      return;
    }

    const data: ThreadSourcesControllerAddFileSourceBody = { file };
    createFileSourceMutation.mutate({ id: threadId, data });
  }

  function createFileSourceAsync({ file }: UploadFileParams) {
    if (!threadId) {
      console.error('Thread ID is required');
      return;
    }

    const data: ThreadSourcesControllerAddFileSourceBody = { file };
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
