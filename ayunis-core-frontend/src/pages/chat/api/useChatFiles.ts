import { useCreateFileSource } from '@/pages/chat/api/useCreateFileSource';
import { useDeleteFileSource } from '@/pages/chat/api/useDeleteFileSource';
import { useSourceProcessingProgress } from '@/pages/chat/api/useSourceProcessingProgress';
import { sourceProcessingSteps } from '@/pages/chat/lib/source-processing-steps';
import type { Thread } from '@/pages/chat/model/openapi';
import type { PendingSourceUpload } from '@/shared/lib/source-upload';

/** A file still in transfer, shown as a badge beside the thread's sources. */
function toPendingSource(upload: PendingSourceUpload) {
  return {
    id: upload.id,
    name: upload.fileName,
    type: 'text' as const,
    status: 'processing' as const,
    uploadProgress: upload.progress,
  };
}

export function useChatFiles(thread: Thread, hasProcessingSources: boolean) {
  const { createFileSource, isLoading, uploads } = useCreateFileSource({
    threadId: thread.id,
  });
  const progress = useSourceProcessingProgress(thread.id, hasProcessingSources);
  const { deleteFileSource } = useDeleteFileSource({ threadId: thread.id });

  return {
    files: [...thread.sources, ...uploads.map(toPendingSource)],
    isUploading: isLoading,
    processingSteps: sourceProcessingSteps(thread.sources, progress.data),
    upload: (files: File[]) =>
      files.forEach((file) => createFileSource({ file })),
    remove: deleteFileSource,
  };
}
