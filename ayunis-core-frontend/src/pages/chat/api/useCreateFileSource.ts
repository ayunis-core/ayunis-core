import {
  getThreadsControllerFindOneQueryKey,
  threadSourcesControllerCompleteUpload,
  threadSourcesControllerCreateUpload,
} from '@/shared/api';
import handleSourceUploadError from '@/shared/lib/handle-source-upload-error';
import { useDirectSourceUpload } from '@/shared/lib/source-upload';
import { useTranslation } from 'react-i18next';
import {
  useIsMutating,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';

interface UseFileSourceProps {
  threadId?: string;
}

interface UploadFileParams {
  file: File;
}

export function useCreateFileSource({ threadId }: UseFileSourceProps = {}) {
  const { t } = useTranslation('common');
  const queryClient = useQueryClient();
  const mutationKey = ['createFileSource', threadId];
  const { uploadAsync, uploads } = useDirectSourceUpload(
    {
      createSession: (file, signal) =>
        threadSourcesControllerCreateUpload(
          threadId ?? '',
          { fileName: file.name, mimeType: file.type, fileSize: file.size },
          signal,
        ),
      complete: (uploadId, signal) =>
        threadSourcesControllerCompleteUpload(threadId ?? '', uploadId, signal),
    },
    {
      onSuccess: () =>
        queryClient.invalidateQueries({
          queryKey: getThreadsControllerFindOneQueryKey(threadId ?? ''),
        }),
    },
    { scope: threadId },
  );
  const createFileSourceMutation = useMutation({
    mutationKey,
    retry: 0,
    mutationFn: ({ file }: UploadFileParams) => uploadAsync(file),
    onError: (error: unknown) => {
      handleSourceUploadError(error, t);
    },
    onSettled: (_result, error) => {
      if (!error || !threadId) return;
      // Failed completion may still have committed; reconcile before allowing another send.
      return queryClient.invalidateQueries({
        queryKey: getThreadsControllerFindOneQueryKey(threadId),
      });
    },
  });

  function createFileSource({ file }: UploadFileParams) {
    if (!threadId) {
      console.error('Thread ID is required');
      return;
    }
    createFileSourceMutation.mutate({ file });
  }

  function createFileSourceAsync({ file }: UploadFileParams) {
    if (!threadId) {
      console.error('Thread ID is required');
      return;
    }
    return createFileSourceMutation.mutateAsync({ file });
  }

  const activeUploads = useIsMutating({ mutationKey });

  return {
    createFileSource,
    createFileSourceAsync,
    isLoading: activeUploads > 0,
    /** Keep placeholders until the uploaded sources appear in the refreshed thread. */
    uploads,
    error: createFileSourceMutation.error,
    reset: createFileSourceMutation.reset,
  };
}
