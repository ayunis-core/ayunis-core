import type { QueryClient } from '@tanstack/react-query';
import {
  getThreadsControllerFindOneQueryKey,
  threadsControllerFindOne,
  threadSourcesControllerCreateDraftUpload,
  threadSourcesControllerCreateUpload,
  threadSourcesControllerCompleteUpload,
  threadSourcesControllerRemoveSource,
  sourceUploadsControllerAbort,
} from '@/shared/api/generated/ayunisCoreAPI';
import type {
  GetThreadResponseDto,
  SourceResponseDto,
} from '@/shared/api/generated/ayunisCoreAPI.schemas';
import extractErrorData from '@/shared/api/extract-error-data';
import { uploadSourceFile } from '@/shared/lib/source-upload';
import {
  addAttachment,
  updateAttachment,
  removeAttachment,
  submitAttachments,
} from '@/features/chat-attachments/model/attachment-store';

interface UploadTask {
  controller: AbortController;
  transfer: Promise<string>;
  completion?: Promise<void>;
  threadId?: string;
  transferred?: boolean;
  uncommittedFailure?: boolean;
  removeRequested: boolean;
  onError: (error: unknown) => void;
}
const tasks = new Map<string, UploadTask>();

export async function refreshAttachmentSources(
  client: QueryClient,
  threadId: string,
  sources?: SourceResponseDto[],
) {
  const queryKey = getThreadsControllerFindOneQueryKey(threadId);
  // The route loader may be awaiting this query. Let it finish before merging
  // completion results, so an older response cannot replace the new sources.
  await client
    .getQueryCache()
    .find({ queryKey })
    ?.promise?.catch(() => undefined);
  if (!client.getQueryData(queryKey))
    await client.query({
      queryKey,
      queryFn: () => threadsControllerFindOne(threadId),
    });
  if (sources)
    client.setQueryData<GetThreadResponseDto>(queryKey, (current) =>
      current
        ? {
            ...current,
            sources: [
              ...current.sources.filter(
                (source) => !sources.some((next) => next.id === source.id),
              ),
              ...sources,
            ],
          }
        : current,
    );
  await client.invalidateQueries({ queryKey }, { cancelRefetch: false });
}

export function startAttachmentUpload(
  scope: string,
  file: File,
  onError: (error: unknown) => void,
  threadId?: string,
): string {
  const id = addAttachment(scope, file);
  const controller = new AbortController();
  const transfer = uploadSourceFile(
    file,
    {
      createSession: (file, signal) => {
        const dto = {
          fileName: file.name,
          mimeType: file.type,
          fileSize: file.size,
        };
        return threadId
          ? threadSourcesControllerCreateUpload(threadId, dto, signal)
          : threadSourcesControllerCreateDraftUpload(dto, signal);
      },
      complete: (uploadId) => Promise.resolve(uploadId),
    },
    controller.signal,
    (progress) => updateAttachment(id, { uploadProgress: progress }),
  );
  tasks.set(id, {
    controller,
    transfer,
    threadId,
    removeRequested: false,
    onError,
  });
  void transfer
    .then(() => {
      const task = tasks.get(id);
      if (task) task.transferred = true;
      updateAttachment(id, { uploadProgress: 1 });
    })
    .catch((error) => {
      const task = tasks.get(id);
      if (task) task.transferred = false;
      if (!controller.signal.aborted) {
        updateAttachment(id, { status: 'failed', uploadProgress: undefined });
        onError(error);
      }
    });
  return id;
}

async function finishAttachment(
  id: string,
  task: UploadTask,
  threadId: string,
  client: QueryClient,
) {
  try {
    const uploadId = await task.transfer;
    // Completion may commit despite a cancelled HTTP request. Keep its result
    // so a concurrent removal can delete every source it created.
    const sources = await threadSourcesControllerCompleteUpload(
      threadId,
      uploadId,
    );
    updateAttachment(id, {
      sourceIds: sources.map((source) => source.id),
      uploadProgress: undefined,
    });
    await refreshAttachmentSources(client, threadId, sources);
    if (task.removeRequested) {
      await Promise.all(
        sources.map((source) =>
          threadSourcesControllerRemoveSource(threadId, source.id),
        ),
      );
      await refreshAttachmentSources(client, threadId);
    }
    if (task.removeRequested) removeAttachment(id);
    else updateAttachment(id, { attached: true });
    tasks.delete(id);
  } catch (error) {
    task.uncommittedFailure = isUncommittedUploadError(error);
    await refreshAttachmentSources(client, threadId).catch(() => undefined);
    if (task.removeRequested && task.controller.signal.aborted) {
      removeAttachment(id);
      tasks.delete(id);
      return;
    }
    updateAttachment(id, {
      status: 'failed',
      uploadProgress: undefined,
      removing: false,
    });
    if (!task.controller.signal.aborted && task.transferred !== false)
      task.onError(error);
  } finally {
    task.completion = undefined;
  }
}

export function completeAttachmentUpload(
  id: string,
  threadId: string,
  client: QueryClient,
): Promise<void> {
  const task = tasks.get(id);
  if (!task) return Promise.resolve();
  task.threadId = threadId;
  task.completion ??= finishAttachment(id, task, threadId, client);
  return task.completion;
}

export function bindAttachments(
  ids: string[],
  threadId: string,
  client: QueryClient,
) {
  submitAttachments(ids, threadId);
  ids.forEach((id) => {
    void completeAttachmentUpload(id, threadId, client);
  });
}

export function discardAttachment(id: string, client: QueryClient) {
  const task = tasks.get(id);
  if (!task) {
    removeAttachment(id);
    return;
  }
  task.removeRequested = true;
  if (!task.transferred) task.controller.abort();
  if (task.threadId && task.transferred !== false && !task.uncommittedFailure) {
    updateAttachment(id, { removing: true });
    void completeAttachmentUpload(id, task.threadId, client);
    return;
  }
  task.controller.abort();
  void task.transfer
    .then((uploadId) => sourceUploadsControllerAbort(uploadId))
    .catch(() => undefined);
  tasks.delete(id);
  removeAttachment(id);
}

function isUncommittedUploadError(error: unknown): boolean {
  try {
    return [
      'SOURCE_UPLOAD_EXPIRED',
      'SOURCE_UPLOAD_NOT_FOUND',
      'SOURCE_UPLOAD_INCOMPLETE',
      'SOURCE_UPLOAD_TARGET_MISMATCH',
      'SOURCE_LIMIT_EXCEEDED',
      'NO_PERMITTED_EMBEDDING_MODEL',
    ].includes(extractErrorData(error).code);
  } catch {
    return false;
  }
}
