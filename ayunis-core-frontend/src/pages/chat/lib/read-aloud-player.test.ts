import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ReadAloudPlayer } from './read-aloud-player';

function audioStream(text = 'ID3frames'): ReadableStream<Uint8Array> {
  return new ReadableStream({
    start(controller) {
      controller.enqueue(new TextEncoder().encode(text));
      controller.close();
    },
  });
}

function pendingRequest() {
  const signals: AbortSignal[] = [];
  const request = vi.fn(
    (signal: AbortSignal) =>
      new Promise<ReadableStream<Uint8Array>>((_resolve, reject) => {
        signals.push(signal);
        signal.addEventListener('abort', () => reject(signal.reason as Error));
      }),
  );
  return { request, signals };
}

function speechElement(): HTMLMediaElement {
  const contexts = vi.mocked(HTMLMediaElement.prototype.play).mock.contexts;
  return contexts[contexts.length - 1] as HTMLMediaElement;
}

describe('ReadAloudPlayer', () => {
  const played: string[] = [];

  beforeEach(() => {
    played.length = 0;
    URL.createObjectURL = vi.fn(() => 'blob:speech');
    URL.revokeObjectURL = vi.fn();
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockImplementation(function (
      this: HTMLMediaElement,
    ) {
      played.push(this.src);
      queueMicrotask(() => this.dispatchEvent(new Event('playing')));
      return Promise.resolve();
    });
    vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {});
    vi.spyOn(HTMLMediaElement.prototype, 'load').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  async function playing(player: ReadAloudPlayer, key: string) {
    await vi.waitFor(() => {
      expect(player.getState()).toEqual({ key, status: 'playing' });
    });
  }

  it('plays the speech of a message and goes idle once it was read', async () => {
    const player = new ReadAloudPlayer();
    const request = vi.fn(() => Promise.resolve(audioStream()));

    const reading = player.play('run-1:de', request);
    expect(player.getState()).toEqual({ key: 'run-1:de', status: 'loading' });
    await playing(player, 'run-1:de');
    speechElement().dispatchEvent(new Event('ended'));
    await reading;

    expect(request).toHaveBeenCalledTimes(1);
    expect(played.at(-1)).toBe('blob:speech');
    expect(player.getState()).toEqual({ key: null, status: 'idle' });
  });

  it('replays a message from the cached audio', async () => {
    const player = new ReadAloudPlayer();
    const request = vi.fn(() => Promise.resolve(audioStream()));

    const first = player.play('run-1:de', request);
    await playing(player, 'run-1:de');
    player.stop();
    await first;
    const second = player.play('run-1:de', request);
    await playing(player, 'run-1:de');
    player.stop();
    await second;

    expect(request).toHaveBeenCalledTimes(1);
    expect(played.filter((src) => src === 'blob:speech')).toHaveLength(2);
  });

  it('reports a media error during playback and goes idle', async () => {
    const player = new ReadAloudPlayer();

    const reading = player.play('run-1:de', () =>
      Promise.resolve(audioStream()),
    );
    await playing(player, 'run-1:de');
    speechElement().dispatchEvent(new Event('error'));

    await expect(reading).rejects.toThrow();
    expect(player.getState()).toEqual({ key: null, status: 'idle' });
  });

  it('reports a media error while the audio is still being fed', async () => {
    // A media buffer that never takes the audio, as after a decode error.
    class StuckMediaSource extends EventTarget {
      static readonly isTypeSupported = () => true;
      readyState = 'open';
      addSourceBuffer = () =>
        Object.assign(new EventTarget(), { appendBuffer: () => {} });
      endOfStream = () => {};
    }
    vi.stubGlobal('MediaSource', StuckMediaSource);
    const player = new ReadAloudPlayer();

    const reading = player.play('run-1:de', () =>
      Promise.resolve(audioStream()),
    );
    await playing(player, 'run-1:de');
    speechElement().dispatchEvent(new Event('error'));

    await expect(reading).rejects.toThrow();
    expect(player.getState()).toEqual({ key: null, status: 'idle' });
  });

  it('stopping cancels the speech request and caches nothing', async () => {
    const player = new ReadAloudPlayer();
    const { request, signals } = pendingRequest();

    const reading = player.play('run-1:de', request);
    player.stop();
    await reading;

    expect(signals[0].aborted).toBe(true);
    expect(player.getState()).toEqual({ key: null, status: 'idle' });
    void player.play('run-1:de', request);
    expect(request).toHaveBeenCalledTimes(2);
    player.stop();
  });

  it('reading another message stops the current one', async () => {
    const player = new ReadAloudPlayer();
    const { request, signals } = pendingRequest();

    const first = player.play('run-1:de', request);
    const second = player.play('run-2:de', () =>
      Promise.resolve(audioStream()),
    );
    await first;
    await playing(player, 'run-2:de');

    expect(signals[0].aborted).toBe(true);
    player.stop();
    await second;
  });

  it('rejects and goes idle when the speech cannot be generated', async () => {
    const player = new ReadAloudPlayer();
    const failure = new Error('Speech request failed with status 500');

    await expect(
      player.play('run-1:de', () => Promise.reject(failure)),
    ).rejects.toBe(failure);

    expect(player.getState()).toEqual({ key: null, status: 'idle' });
  });

  it('plays the downloaded file as MP3', async () => {
    const player = new ReadAloudPlayer();

    const reading = player.play('run-1:de', () =>
      Promise.resolve(audioStream()),
    );
    await playing(player, 'run-1:de');
    player.stop();
    await reading;

    const file = vi.mocked(URL.createObjectURL).mock.calls[0][0] as Blob;
    expect(file.type).toBe('audio/mpeg');
  });

  it('caches nothing when the downloaded file cannot be played', async () => {
    const player = new ReadAloudPlayer();
    const request = vi.fn(() => Promise.resolve(audioStream()));
    vi.mocked(HTMLMediaElement.prototype.play).mockImplementation(function (
      this: HTMLMediaElement,
    ) {
      return this.src === 'blob:speech'
        ? Promise.reject(new DOMException('Not allowed', 'NotAllowedError'))
        : Promise.resolve();
    });

    await expect(player.play('run-1:de', request)).rejects.toThrow();
    await expect(player.play('run-1:de', request)).rejects.toThrow();

    expect(request).toHaveBeenCalledTimes(2);
  });

  it('ignores the events of the click-time start while the file downloads', async () => {
    const player = new ReadAloudPlayer();
    const { request, signals } = pendingRequest();
    vi.mocked(HTMLMediaElement.prototype.play).mockImplementation(function (
      this: HTMLMediaElement,
    ) {
      queueMicrotask(() => {
        this.dispatchEvent(new Event('playing'));
        this.dispatchEvent(new Event('ended'));
      });
      return Promise.resolve();
    });

    const reading = player.play('run-1:de', request);
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(signals[0].aborted).toBe(false);
    expect(player.getState()).toEqual({ key: 'run-1:de', status: 'loading' });
    player.stop();
    await reading;
  });

  it('starts the audio during the click when it has to download the file first', async () => {
    const player = new ReadAloudPlayer();
    const { request } = pendingRequest();

    const reading = player.play('run-1:de', request);

    // Browsers that only allow audio started by a user gesture would block
    // a play() that waits for the download; pausing it would cancel it.
    expect(played).toHaveLength(1);
    expect(HTMLMediaElement.prototype.pause).not.toHaveBeenCalled();
    player.stop();
    await reading;
  });
});
