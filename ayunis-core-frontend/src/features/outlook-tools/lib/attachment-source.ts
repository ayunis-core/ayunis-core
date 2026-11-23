import { isAxiosError } from 'axios';
import type {
  CSVDataSourceResponseDto,
  FileSourceResponseDto,
  SourceUploadSessionResponseDto,
  UrlSourceResponseDto,
} from '@ayunis/api-client/schemas';
import type { SignUploadRequest } from '@/shared/lib/source-upload/transfer-source-file';

type ThreadSourceResponse =
  FileSourceResponseDto | UrlSourceResponseDto | CSVDataSourceResponseDto;

/**
 * What is read from a thread source response. Picked from the generated DTOs
 * so a backend change to these fields fails the type-check here.
 */
export type AttachmentSource = Pick<
  ThreadSourceResponse,
  'id' | 'name' | 'status' | 'processingErrorCode'
>;

/** The thread source endpoints, called with the caller's authentication. */
export interface AttachmentSourceApi {
  createUpload(
    threadId: string,
    file: File,
  ): Promise<SourceUploadSessionResponseDto>;
  completeUpload(
    threadId: string,
    uploadId: string,
  ): Promise<AttachmentSource[]>;
  signUpload: SignUploadRequest;
  abortUpload(uploadId: string): Promise<void>;
  listSources(threadId: string): Promise<AttachmentSource[]>;
}

const POLL_INTERVAL_MS = 2_000;
const POLL_TIMEOUT_MS = 120_000;

export interface AttachmentFile {
  name: string;
  contentType: string;
  base64: string;
  /** Identifies the attachment itself: its mail, its id there and its size. */
  key: string;
}

function toFile({ name, contentType, base64 }: AttachmentFile): File {
  const bytes = Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
  return new File([bytes], name, { type: contentType });
}

function aborted(): DOMException {
  return new DOMException('Aborted', 'AbortError');
}

/** `uploadSourceFile` always wants a signal; a run without one never aborts. */
function neverAborts(): AbortSignal {
  return new AbortController().signal;
}

const wait = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    const timer = window.setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    function onAbort() {
      window.clearTimeout(timer);
      reject(aborted());
    }
    signal?.addEventListener('abort', onAbort, { once: true });
  });

async function waitUntilProcessed(
  api: AttachmentSourceApi,
  threadId: string,
  ids: Set<string>,
  signal?: AbortSignal,
): Promise<AttachmentSource[]> {
  const deadline = Date.now() + POLL_TIMEOUT_MS;
  for (;;) {
    if (signal?.aborted) throw aborted();
    const sources = (await api.listSources(threadId)).filter(({ id }) =>
      ids.has(id),
    );
    const done = sources.every(({ status }) => status !== 'processing');
    if (done || Date.now() > deadline) return sources;
    await wait(POLL_INTERVAL_MS, signal);
  }
}

function describe(sources: AttachmentSource[]): string {
  return JSON.stringify({
    attachedAsSources: sources.map(({ id, name }) => ({ id, name })),
    note: 'The attachment was added to this chat as a source. Read it with source_get_text or search it with source_query.',
  });
}

/**
 * What this pane already uploaded, so a second `read_attachment` of the same
 * attachment does not upload it again, pay for processing twice and spend
 * another of the thread's source slots. Keyed by the attachment, never by its
 * name: two mails may both attach an `invoice.pdf`, and `listSources` answers
 * with names only, so the server cannot tell them apart. Reloading the pane
 * empties this and the attachment is uploaded once more.
 *
 * Every source the attachment produced is kept, because a workbook becomes one
 * source per sheet, and they are kept from the moment the upload completes
 * rather than once processing ends: the sources exist on the thread by then, so
 * a read that stops or times out while polling must resume on them instead of
 * uploading the file again.
 */
const uploadedSources = new Map<string, AttachmentSource[]>();

function reuseKey(threadId: string, attachment: AttachmentFile): string {
  return `${threadId}|${attachment.key}`;
}

/**
 * PDFs and Office documents go through the backend's source pipeline instead
 * of a second parser in the pane: the attachment becomes a source of the
 * chat, and the run the pane resumes offers the source tools to read it.
 */
export async function addAttachmentAsSource(
  api: AttachmentSourceApi,
  threadId: string,
  attachment: AttachmentFile,
  signal?: AbortSignal,
): Promise<string> {
  const key = reuseKey(threadId, attachment);
  let added = uploadedSources.get(key);
  if (!added) {
    const uploaded = await upload(
      api,
      threadId,
      attachment,
      signal ?? neverAborts(),
    );
    if (typeof uploaded === 'string') return uploaded;
    added = uploaded;
    uploadedSources.set(key, added);
  }

  const sources = await waitUntilProcessed(
    api,
    threadId,
    new Set(added.map(({ id }) => id)),
    signal,
  );
  const failed = sources.find(({ status }) => status === 'failed');
  if (failed || sources.length === 0) {
    return JSON.stringify({
      error: failed?.processingErrorCode ?? 'the attachment could not be read',
    });
  }
  if (sources.some(({ status }) => status === 'processing')) {
    return JSON.stringify({
      error:
        'the attachment is still being processed; it is attached to this chat as a source, read it with the source tools in a moment',
    });
  }
  return describe(sources);
}

/** The sources, or the error text the model should see instead. */
async function upload(
  api: AttachmentSourceApi,
  threadId: string,
  attachment: AttachmentFile,
  signal: AbortSignal,
): Promise<AttachmentSource[] | string> {
  // Uppy and the S3 multipart machinery are only needed for an attachment,
  // which most chats never have; keep them out of the pane's first load.
  const { uploadSourceFile } = await import('@/shared/lib/source-upload');
  try {
    return await uploadSourceFile(
      toFile(attachment),
      {
        createSession: (file) => api.createUpload(threadId, file),
        complete: (uploadId) => api.completeUpload(threadId, uploadId),
        sign: (uploadId, body, abort) => api.signUpload(uploadId, body, abort),
        abort: (uploadId) => api.abortUpload(uploadId),
      },
      signal,
    );
  } catch (cause) {
    if (httpStatus(cause) === 413) {
      return JSON.stringify({
        error: 'the attachment is larger than this chat accepts',
      });
    }
    throw cause;
  }
}

/** The pane's fetch errors carry `status`, the app's axios errors `response`. */
function httpStatus(cause: unknown): number | undefined {
  if (typeof cause !== 'object' || cause === null) return undefined;
  if ('status' in cause && typeof cause.status === 'number') {
    return cause.status;
  }
  if (isAxiosError(cause)) return cause.response?.status;
  return undefined;
}
