import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  PaneRequestError,
  type PaneChatApi,
  type PaneSource,
} from '@/outlook/api/pane-chat-api';
import { addAttachmentAsSource } from '@/outlook/lib/attachment-source';

// The transfer itself is the shared direct-upload library's, tested there;
// here only the pane's wiring around it is under test.
const uploadSourceFile = vi.hoisted(() => vi.fn());
vi.mock('@/shared/lib/source-upload', () => ({ uploadSourceFile }));

const pdf = {
  name: 'Antrag.pdf',
  contentType: 'application/pdf',
  base64: btoa('%PDF-1.4'),
  key: 'read:mail-a|attachment-1|8',
};

/** Same file name, another mail: a different document. */
const sameNameOtherMail = { ...pdf, key: 'read:mail-b|attachment-1|9' };

function source(
  status: PaneSource['status'],
  errorCode?: PaneSource['processingErrorCode'],
  id = 'source-1',
): PaneSource {
  return {
    id,
    name: 'Antrag.pdf',
    status,
    processingErrorCode: errorCode,
  };
}

/** A workbook becomes one source per sheet. */
function sheets(status: PaneSource['status']): PaneSource[] {
  return [source(status), source(status, undefined, 'source-2')];
}

/** `listed` answers the `listSources` poll rounds in order. */
function fakeApi(listed: PaneSource[][]) {
  return {
    createUpload: vi.fn(() =>
      Promise.resolve({
        id: 'upload-1',
        multipart: false,
        partSizeBytes: 8 * 1024 * 1024,
        expiresAt: '2026-11-16T12:00:00.000Z',
      }),
    ),
    completeUpload: vi.fn(() => Promise.resolve([source('processing')])),
    signUpload: vi.fn(() => Promise.resolve({ url: 'https://storage/put' })),
    abortUpload: vi.fn(() => Promise.resolve()),
    listSources: vi.fn(() => Promise.resolve(listed.shift() ?? [])),
  } as unknown as PaneChatApi;
}

describe('addAttachmentAsSource', () => {
  beforeEach(() => {
    uploadSourceFile.mockReset();
    uploadSourceFile.mockResolvedValue([source('processing')]);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('waits until the attachment is processed before the model is told to read it', async () => {
    vi.useFakeTimers();
    const api = fakeApi([[source('processing')], [source('ready')]]);

    const pending = addAttachmentAsSource(api, 'processing-thread', pdf);
    await vi.advanceTimersByTimeAsync(2_000);

    expect(JSON.parse(await pending)).toMatchObject({
      attachedAsSources: [{ id: 'source-1', name: 'Antrag.pdf' }],
    });
  });

  it('reports a failed extraction to the model as an error', async () => {
    const api = fakeApi([[source('failed', 'DOCUMENT_UNREADABLE')]]);

    const result = await addAttachmentAsSource(api, 'failed-thread', pdf);

    expect(JSON.parse(result)).toEqual({ error: 'DOCUMENT_UNREADABLE' });
  });

  it('uploads an attachment it already uploaded to this chat only once', async () => {
    const api = fakeApi([[source('ready')], [source('ready')]]);

    await addAttachmentAsSource(api, 'reuse-thread', pdf);
    const second = await addAttachmentAsSource(api, 'reuse-thread', pdf);

    expect(uploadSourceFile).toHaveBeenCalledTimes(1);
    expect(JSON.parse(second)).toMatchObject({
      attachedAsSources: [{ id: 'source-1', name: 'Antrag.pdf' }],
    });
  });

  it("uploads another mail's attachment of the same name, rather than reading the first", async () => {
    const api = fakeApi([[source('ready')], [source('ready')]]);

    await addAttachmentAsSource(api, 'collision-thread', pdf);
    await addAttachmentAsSource(api, 'collision-thread', sameNameOtherMail);

    expect(uploadSourceFile).toHaveBeenCalledTimes(2);
  });

  it('stops polling when the run is aborted', async () => {
    vi.useFakeTimers();
    const api = fakeApi([[source('processing')], [source('processing')]]);
    const abort = new AbortController();

    const pending = addAttachmentAsSource(
      api,
      'abort-thread',
      pdf,
      abort.signal,
    );
    const settled = expect(pending).rejects.toMatchObject({
      name: 'AbortError',
    });
    await vi.advanceTimersByTimeAsync(10);
    abort.abort();

    await settled;
    expect(api.listSources).toHaveBeenCalledTimes(1);
  });

  it('reserves, transfers and completes the upload through the thread', async () => {
    const api = fakeApi([[source('ready')]]);

    await addAttachmentAsSource(api, 'upload-thread', pdf);

    const [file, target] = uploadSourceFile.mock.calls[0] as [
      File,
      {
        createSession: (file: File) => unknown;
        complete: (uploadId: string) => unknown;
      },
    ];
    expect(file.name).toBe('Antrag.pdf');
    await target.createSession(file);
    await target.complete('upload-1');
    expect(api.createUpload).toHaveBeenCalledWith('upload-thread', file);
    expect(api.completeUpload).toHaveBeenCalledWith(
      'upload-thread',
      'upload-1',
    );
  });

  it('tells the model why an oversized attachment was refused', async () => {
    const api = fakeApi([]);
    uploadSourceFile.mockRejectedValueOnce(
      new PaneRequestError(413, 'Payload Too Large'),
    );

    const result = await addAttachmentAsSource(api, 'oversized-thread', pdf);

    expect(JSON.parse(result)).toEqual({
      error: 'the attachment is larger than this chat accepts',
    });
  });
  it('resumes polling the sources it uploaded when a stopped read is retried', async () => {
    vi.useFakeTimers();
    const api = fakeApi([[source('processing')], [source('ready')]]);
    const abort = new AbortController();
    const stopped = addAttachmentAsSource(
      api,
      'stopped-thread',
      pdf,
      abort.signal,
    );
    const settled = expect(stopped).rejects.toMatchObject({
      name: 'AbortError',
    });
    await vi.advanceTimersByTimeAsync(10);
    abort.abort();
    await settled;

    const retried = await addAttachmentAsSource(api, 'stopped-thread', pdf);

    // The sources were on the thread already; uploading again would spend
    // another of its slots.
    expect(uploadSourceFile).toHaveBeenCalledTimes(1);
    expect(JSON.parse(retried)).toMatchObject({
      attachedAsSources: [{ id: 'source-1' }],
    });
  });

  it('reuses every sheet of a workbook, not only the first', async () => {
    uploadSourceFile.mockResolvedValue(sheets('processing'));
    const api = fakeApi([sheets('ready'), sheets('ready')]);

    const first = await addAttachmentAsSource(api, 'workbook-thread', pdf);
    const second = await addAttachmentAsSource(api, 'workbook-thread', pdf);

    expect(uploadSourceFile).toHaveBeenCalledTimes(1);
    const ids = (text: string) =>
      (
        JSON.parse(text) as { attachedAsSources: { id: string }[] }
      ).attachedAsSources.map(({ id }) => id);
    expect(ids(first)).toEqual(['source-1', 'source-2']);
    expect(ids(second)).toEqual(['source-1', 'source-2']);
  });
});
