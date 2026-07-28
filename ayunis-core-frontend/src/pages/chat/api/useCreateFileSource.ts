import {
  getThreadsControllerFindOneQueryKey,
  threadSourcesControllerFinalizeUpload,
} from '@/shared/api';
import handleSourceUploadError from '@/shared/lib/handle-source-upload-error';
import { uploadFileResumable } from '@/shared/lib/upload-file-resumable';
import { useTranslation } from 'react-i18next';
import {
  useIsMutating,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import { useRouter } from '@tanstack/react-router';

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
  const mutationKey = ['createFileSource', threadId];
  const createFileSourceMutation = useMutation({
    mutationKey,
    retry: 0,
    // Resumable chunked upload (tus), then a finalize call that validates and
    // starts processing. tus handles retries/resume internally.
    mutationFn: async ({ id, file }: { id: string; file: File }) => {
      const uploadId = await uploadFileResumable(file);
      return threadSourcesControllerFinalizeUpload(id, uploadId);
    },
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

    createFileSourceMutation.mutate({ id: threadId, file });
  }

  function createFileSourceAsync({ file }: UploadFileParams) {
    if (!threadId) {
      console.error('Thread ID is required');
      return;
    }

    return createFileSourceMutation.mutateAsync({ id: threadId, file });
  }

  const activeUploads = useIsMutating({ mutationKey });

  return {
    createFileSource,
    createFileSourceAsync,
    isLoading: activeUploads > 0,
    error: createFileSourceMutation.error,
    reset: createFileSourceMutation.reset,
  };
}
