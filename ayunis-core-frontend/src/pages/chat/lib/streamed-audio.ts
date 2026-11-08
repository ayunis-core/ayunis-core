export const MP3_MIME_TYPE = 'audio/mpeg';
// Played audio kept behind the playhead when room has to be made.
const PLAYED_AUDIO_KEPT_SECONDS = 2;

export function supportsStreamedAudio(): boolean {
  return (
    typeof MediaSource !== 'undefined' &&
    MediaSource.isTypeSupported(MP3_MIME_TYPE)
  );
}

/**
 * Plays MP3 audio while it is still downloading. The download is read as fast
 * as it arrives — so the speech request finishes in seconds and the complete
 * file is available early — while the media buffer, which browsers cap at a
 * few megabytes, is fed only as playback frees room.
 */
export class StreamedAudio {
  readonly url: string;
  private readonly mediaSource = new MediaSource();
  private readonly chunks: Uint8Array[] = [];
  private downloaded = false;
  private downloadFailure: Error | undefined;
  private wakeFeeder: () => void = () => {};

  constructor(
    private readonly audio: HTMLAudioElement,
    private readonly signal: AbortSignal,
  ) {
    this.url = URL.createObjectURL(this.mediaSource);
  }

  /**
   * `downloaded` resolves with the complete file, `fed` once the media buffer
   * has taken all of it — near the end of playback for long audio.
   */
  play(body: ReadableStream<Uint8Array>): {
    downloaded: Promise<Blob>;
    fed: Promise<void>;
  } {
    return { downloaded: this.download(body), fed: this.feed() };
  }

  dispose(): void {
    URL.revokeObjectURL(this.url);
  }

  private async download(body: ReadableStream<Uint8Array>): Promise<Blob> {
    const reader = body.getReader();
    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        this.chunks.push(value);
        this.wakeFeeder();
      }
      return new Blob(this.chunks as BlobPart[], { type: MP3_MIME_TYPE });
    } catch (error) {
      this.downloadFailure = error as Error;
      throw error;
    } finally {
      this.downloaded = true;
      this.wakeFeeder();
    }
  }

  private async feed(): Promise<void> {
    if (this.mediaSource.readyState !== 'open') {
      await nextEvent(this.mediaSource, 'sourceopen', this.signal);
    }
    const sourceBuffer = this.mediaSource.addSourceBuffer(MP3_MIME_TYPE);
    for (let index = 0; ; index++) {
      while (index >= this.chunks.length && !this.downloaded) {
        await new Promise<void>((resolve) => {
          this.wakeFeeder = resolve;
        });
      }
      if (this.downloadFailure) throw this.downloadFailure;
      if (index >= this.chunks.length) break;
      await this.append(sourceBuffer, this.chunks[index]);
    }
    this.mediaSource.endOfStream();
  }

  private async append(
    sourceBuffer: SourceBuffer,
    chunk: Uint8Array,
  ): Promise<void> {
    for (;;) {
      try {
        sourceBuffer.appendBuffer(chunk as BufferSource);
        await nextEvent(sourceBuffer, 'updateend', this.signal);
        return;
      } catch (error) {
        if (!isQuotaExceeded(error)) throw error;
        await this.makeRoom(sourceBuffer);
      }
    }
  }

  private async makeRoom(sourceBuffer: SourceBuffer): Promise<void> {
    await nextEvent(this.audio, 'timeupdate', this.signal);
    const playedUntil = this.audio.currentTime - PLAYED_AUDIO_KEPT_SECONDS;
    if (playedUntil <= 0) return;
    sourceBuffer.remove(0, playedUntil);
    await nextEvent(sourceBuffer, 'updateend', this.signal);
  }
}

function isQuotaExceeded(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'QuotaExceededError';
}

function nextEvent(
  target: EventTarget,
  type: string,
  signal: AbortSignal,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const onAbort = () => {
      target.removeEventListener(type, onEvent);
      reject(signal.reason as Error);
    };
    const onEvent = () => {
      signal.removeEventListener('abort', onAbort);
      resolve();
    };
    if (signal.aborted) {
      onAbort();
      return;
    }
    target.addEventListener(type, onEvent, { once: true });
    signal.addEventListener('abort', onAbort, { once: true });
  });
}
