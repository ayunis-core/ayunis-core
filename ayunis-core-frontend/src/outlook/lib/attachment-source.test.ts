import { afterEach, describe, expect, it, vi } from 'vitest';
import type { PaneChatApi, PaneSource } from '@/outlook/api/pane-chat-api';
import { addAttachmentAsSource } from '@/outlook/lib/attachment-source';

const pdf = {
  name: 'Antrag.pdf',
  contentType: 'application/pdf',
  base64: btoa('%PDF-1.4'),
};

function source(status: PaneSource['status'], error?: string): PaneSource {
  return {
    id: 'source-1',
    name: 'Antrag.pdf',
    status,
    processingError: error,
  };
}

function fakeApi(listed: PaneSource[][]) {
  return {
    addFileSource: vi.fn(() => Promise.resolve([source('processing')])),
    listSources: vi.fn(() => Promise.resolve(listed.shift() ?? [])),
  } as unknown as PaneChatApi;
}

describe('addAttachmentAsSource', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('waits until the attachment is processed before the model is told to read it', async () => {
    vi.useFakeTimers();
    const api = fakeApi([[source('processing')], [source('ready')]]);

    const pending = addAttachmentAsSource(api, 'thread-1', pdf);
    await vi.advanceTimersByTimeAsync(2_000);

    expect(JSON.parse(await pending)).toMatchObject({
      attachedAsSources: [{ id: 'source-1', name: 'Antrag.pdf' }],
    });
  });

  it('reports a failed extraction to the model as an error', async () => {
    const api = fakeApi([[source('failed', 'The PDF is encrypted')]]);

    const result = await addAttachmentAsSource(api, 'thread-1', pdf);

    expect(JSON.parse(result)).toEqual({ error: 'The PDF is encrypted' });
  });
});
