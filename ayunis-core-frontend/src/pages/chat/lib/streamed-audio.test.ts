import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { StreamedAudio } from './streamed-audio';

let quotaFullOnAttempt: number | undefined;
const mediaSources: FakeMediaSource[] = [];

class FakeSourceBuffer extends EventTarget {
  readonly appended: string[] = [];
  readonly removed: [number, number][] = [];
  private attempts = 0;

  appendBuffer(chunk: Uint8Array) {
    this.attempts++;
    if (this.attempts === quotaFullOnAttempt) {
      throw new DOMException('The SourceBuffer is full', 'QuotaExceededError');
    }
    this.appended.push(new TextDecoder().decode(chunk));
    queueMicrotask(() => this.dispatchEvent(new Event('updateend')));
  }

  remove(start: number, end: number) {
    this.removed.push([start, end]);
    queueMicrotask(() => this.dispatchEvent(new Event('updateend')));
  }
}

class FakeMediaSource extends EventTarget {
  readyState: 'closed' | 'open' | 'ended' = 'closed';
  readonly sourceBuffer = new FakeSourceBuffer();

  constructor() {
    super();
    mediaSources.push(this);
    queueMicrotask(() => {
      this.readyState = 'open';
      this.dispatchEvent(new Event('sourceopen'));
    });
  }

  addSourceBuffer() {
    return this.sourceBuffer;
  }

  endOfStream() {
    this.readyState = 'ended';
  }
}

function streamOf(parts: string[]): ReadableStream<Uint8Array> {
  return new ReadableStream({
    start(controller) {
      for (const part of parts)
        controller.enqueue(new TextEncoder().encode(part));
      controller.close();
    },
  });
}

describe('StreamedAudio', () => {
  beforeEach(() => {
    vi.stubGlobal('MediaSource', FakeMediaSource);
    URL.createObjectURL = vi.fn(() => 'blob:streamed');
    URL.revokeObjectURL = vi.fn();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    quotaFullOnAttempt = undefined;
  });

  it('feeds every chunk to the media buffer in order and returns the whole file', async () => {
    const streamed = new StreamedAudio(
      document.createElement('audio'),
      new AbortController().signal,
    );

    const { downloaded, fed } = streamed.play(
      streamOf(['ID3', 'frame-1', 'frame-2']),
    );
    const file = await downloaded;
    await fed;

    const media = mediaSources[mediaSources.length - 1];
    expect(streamed.url).toBe('blob:streamed');
    expect(media.sourceBuffer.appended).toEqual(['ID3', 'frame-1', 'frame-2']);
    expect(media.readyState).toBe('ended');
    expect(await file.text()).toBe('ID3frame-1frame-2');
    expect(file.type).toBe('audio/mpeg');
  });

  it('frees played audio when the media buffer is full', async () => {
    quotaFullOnAttempt = 2;
    const audio = document.createElement('audio');
    Object.defineProperty(audio, 'currentTime', { value: 30 });
    const streamed = new StreamedAudio(audio, new AbortController().signal);

    const { fed } = streamed.play(streamOf(['ID3', 'frame-1']));
    await vi.waitFor(() => {
      audio.dispatchEvent(new Event('timeupdate'));
      expect(
        mediaSources[mediaSources.length - 1].sourceBuffer.removed,
      ).toEqual([[0, 28]]);
    });
    await fed;

    expect(mediaSources[mediaSources.length - 1].sourceBuffer.appended).toEqual(
      ['ID3', 'frame-1'],
    );
  });

  it('has the whole file while the media buffer still waits for room', async () => {
    quotaFullOnAttempt = 2;
    const streamed = new StreamedAudio(
      document.createElement('audio'),
      new AbortController().signal,
    );

    const { downloaded, fed } = streamed.play(streamOf(['ID3', 'frame-1']));
    const file = await downloaded;

    expect(await file.text()).toBe('ID3frame-1');
    expect(mediaSources[mediaSources.length - 1].sourceBuffer.appended).toEqual(
      ['ID3'],
    );
    fed.catch(() => undefined);
  });

  it('stops feeding when playback is stopped', async () => {
    const controller = new AbortController();
    const streamed = new StreamedAudio(
      document.createElement('audio'),
      controller.signal,
    );
    const download = new ReadableStream<Uint8Array>({
      start(stream) {
        controller.signal.addEventListener('abort', () => {
          stream.error(controller.signal.reason);
        });
      },
    });

    const { downloaded, fed } = streamed.play(download);
    controller.abort(new DOMException('stopped', 'AbortError'));

    await expect(downloaded).rejects.toMatchObject({ name: 'AbortError' });
    await expect(fed).rejects.toMatchObject({ name: 'AbortError' });
  });
});
