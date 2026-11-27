import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  useIsMutating,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import {
  getThreadsControllerFindOneQueryKey,
  threadSourcesControllerCompleteUpload,
  threadSourcesControllerCreateUpload,
  threadSourcesControllerRemoveSource,
} from '@ayunis/api-client/endpoints';
import type { GetThreadResponseDto } from '@ayunis/api-client/schemas';
import type { ChatSourceAttachment } from '@ayunis/chat/attachments';
import {
  showComposerError,
  sourceRemoveErrorKey,
  sourceUploadErrorKey,
} from './composer-errors';

interface PendingUpload {
  readonly id: string;
  readonly fileName: string;
  /** Fraction of bytes stored so far, 0..1. */
  readonly progress: number;
}

function sourceUploadTarget(threadId: string) {
  return {
    createSession: (file: File, signal: AbortSignal) =>
      threadSourcesControllerCreateUpload(
        threadId,
        { fileName: file.name, mimeType: file.type, fileSize: file.size },
        signal,
      ),
    complete: (uploadId: string, signal: AbortSignal) =>
      threadSourcesControllerCompleteUpload(threadId, uploadId, signal),
  };
}

type ThreadSource = GetThreadResponseDto['sources'][number];

function withSources(
  thread: GetThreadResponseDto | undefined,
  added: readonly ThreadSource[],
) {
  if (!thread) return thread;
  const known = new Set(thread.sources.map(({ id }) => id));
  const sources = added.filter(({ id }) => !known.has(id));
  return { ...thread, sources: [...thread.sources, ...sources] };
}

function toPendingSource(upload: PendingUpload): ChatSourceAttachment {
  return {
    id: upload.id,
    name: upload.fileName,
    type: 'text',
    status: 'processing',
    uploadProgress: upload.progress,
  };
}

function usePendingUploads() {
  const [uploads, setUploads] = useState<readonly PendingUpload[]>([]);
  const add = useCallback((upload: PendingUpload) => {
    setUploads((current) => [...current, upload]);
  }, []);
  // A retried part reports its bytes from zero again; the bar never backs up.
  const progress = useCallback((id: string, fraction: number) => {
    setUploads((current) =>
      current.map((upload) =>
        upload.id === id
          ? { ...upload, progress: Math.max(upload.progress, fraction) }
          : upload,
      ),
    );
  }, []);
  const remove = useCallback((id: string) => {
    setUploads((current) => current.filter((upload) => upload.id !== id));
  }, []);
  return { uploads, add, progress, remove };
}

function useCreateThreadSource(
  threadId: string,
  pending: ReturnType<typeof usePendingUploads>,
) {
  const { t } = useTranslation('common');
  const queryClient = useQueryClient();
  const threadKey = getThreadsControllerFindOneQueryKey(threadId);
  const refreshThread = () =>
    queryClient.invalidateQueries({ queryKey: threadKey });
  return useMutation({
    mutationKey: ['createFileSource', threadId],
    retry: 0,
    mutationFn: async (file: File) => {
      const id = crypto.randomUUID();
      pending.add({ id, fileName: file.name, progress: 0 });
      try {
        const { uploadSourceFile } =
          await import('@ayunis/api-client/source-upload');
        const added = await uploadSourceFile(
          file,
          sourceUploadTarget(threadId),
          new AbortController().signal,
          (fraction) => pending.progress(id, fraction),
        );
        // The thread shows the source (and holds sends while it processes)
        // even if the refresh below fails; it replaces the placeholder.
        queryClient.setQueryData<GetThreadResponseDto>(threadKey, (thread) =>
          withSources(thread, added),
        );
        pending.remove(id);
        await refreshThread().catch(() => undefined);
      } finally {
        pending.remove(id);
      }
    },
    onError: (error) => showComposerError(t(sourceUploadErrorKey(error))),
    // A failed completion may still have committed; reconcile before another send.
    onSettled: (_result, error) => (error ? refreshThread() : undefined),
  });
}

/**
 * Uploads files to the thread directly to storage, showing each one with its
 * progress until the thread lists it as a source.
 */
export function useThreadSources(
  threadId: string,
  sources: readonly ChatSourceAttachment[],
) {
  const { t } = useTranslation('common');
  const queryClient = useQueryClient();
  const pending = usePendingUploads();
  const create = useCreateThreadSource(threadId, pending);
  const uploading =
    useIsMutating({ mutationKey: ['createFileSource', threadId] }) > 0;

  return {
    sources: [...sources, ...pending.uploads.map(toPendingSource)],
    uploading,
    upload: (files: File[]) => files.forEach((file) => create.mutate(file)),
    remove: (sourceId: string) => {
      threadSourcesControllerRemoveSource(threadId, sourceId)
        .catch((error: unknown) =>
          showComposerError(t(sourceRemoveErrorKey(error))),
        )
        .finally(
          () =>
            void queryClient.invalidateQueries({
              queryKey: getThreadsControllerFindOneQueryKey(threadId),
            }),
        );
    },
  };
}
