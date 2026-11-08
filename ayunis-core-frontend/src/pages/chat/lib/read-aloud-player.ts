import {
  MP3_MIME_TYPE,
  StreamedAudio,
  supportsStreamedAudio,
} from '@/pages/chat/lib/streamed-audio';

export type ReadAloudStatus = 'idle' | 'loading' | 'playing';

export interface ReadAloudState {
  key: string | null;
  status: ReadAloudStatus;
}

export type SpeechRequest = (
  signal: AbortSignal,
) => Promise<ReadableStream<Uint8Array>>;

interface Session {
  key: string;
  audio: HTMLAudioElement;
  controller: AbortController;
  cleanups: (() => void)[];
  /** Settles when the speech has been read to the end, stopped or failed. */
  playedThrough?: Promise<void>;
}

const IDLE: ReadAloudState = { key: null, status: 'idle' };
const CACHED_MESSAGES = 20;
// A WAV header without samples: something to start the audio element on.
const SILENCE =
  'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=';

/**
 * Reads one message aloud at a time across the whole app and keeps the audio
 * of recently read messages, so replaying one does not generate it again.
 */
export class ReadAloudPlayer {
  private state = IDLE;
  private session: Session | null = null;
  private readonly listeners = new Set<() => void>();
  private readonly cache = new Map<string, Blob>();

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getState = (): ReadAloudState => this.state;

  /**
   * Resolves once the message has been read to the end or was stopped;
   * rejects when its audio cannot be produced or played.
   */
  async play(key: string, requestSpeech: SpeechRequest): Promise<void> {
    this.stop();
    const session = this.startSession(key);
    try {
      const cached = this.cache.get(key);
      if (cached) {
        await this.playFile(session, cached);
      } else if (supportsStreamedAudio()) {
        await this.playStreamed(session, requestSpeech);
      } else {
        await this.playDownloaded(session, requestSpeech);
      }
      await session.playedThrough;
      if (this.session === session) this.stop();
    } catch (error) {
      if (session.controller.signal.aborted) return;
      this.stop();
      throw error;
    }
  }

  stop = (): void => {
    const session = this.session;
    if (!session) return;
    this.session = null;
    session.controller.abort(new DOMException('Stopped', 'AbortError'));
    session.audio.pause();
    session.audio.removeAttribute('src');
    session.audio.load();
    session.cleanups.forEach((cleanup) => cleanup());
    this.setState(IDLE);
  };

  private startSession(key: string): Session {
    const session: Session = {
      key,
      audio: new Audio(),
      controller: new AbortController(),
      cleanups: [],
    };
    this.session = session;
    this.setState({ key, status: 'loading' });
    return session;
  }

  /**
   * Plays the speech on the session's element. Its events count only from
   * here on, not those of the silence started during the click.
   */
  private playSpeech(session: Session, src: string): Promise<void> {
    const ifCurrent = (action: () => void) => () => {
      if (this.session === session) action();
    };
    session.audio.addEventListener(
      'playing',
      ifCurrent(() => this.setState({ key: session.key, status: 'playing' })),
    );
    session.playedThrough = new Promise<void>((resolve, reject) => {
      session.audio.addEventListener('ended', () => resolve());
      session.audio.addEventListener('error', () =>
        reject(new Error('The speech could not be played')),
      );
      session.controller.signal.addEventListener('abort', () => resolve());
    });
    // Awaited by play(), or abandoned when starting playback fails first.
    session.playedThrough.catch(() => undefined);
    session.audio.src = src;
    return session.audio.play();
  }

  private async playStreamed(
    session: Session,
    requestSpeech: SpeechRequest,
  ): Promise<void> {
    const streamed = new StreamedAudio(
      session.audio,
      session.controller.signal,
    );
    session.cleanups.push(() => streamed.dispose());
    // Started before the request so it still counts as part of the click for
    // browsers that only allow audio started by a user gesture.
    const started = this.playSpeech(session, streamed.url);
    // Settled below, or abandoned when the request fails first.
    started.catch(() => undefined);
    const body = await requestSpeech(session.controller.signal);
    const { downloaded, fed } = streamed.play(body);
    // Awaited below, or abandoned when the download fails first.
    fed.catch(() => undefined);
    const [, file] = await Promise.all([started, downloaded]);
    // Cached as soon as it is complete, so stopping a long answer early does
    // not cost a second generation.
    this.remember(session.key, file);
    // A media error can leave the feeder waiting for room that never comes.
    await Promise.all([fed, session.playedThrough]);
  }

  private async playDownloaded(
    session: Session,
    requestSpeech: SpeechRequest,
  ): Promise<void> {
    // The file plays only after the download, long after the click. Browsers
    // that only allow audio started by a user gesture accept that later
    // play() once the element played during the click, so the silence must
    // play through rather than be paused.
    session.audio.src = SILENCE;
    session.audio.play().catch(() => undefined);
    const file = await new Response(
      await requestSpeech(session.controller.signal),
      { headers: { 'Content-Type': MP3_MIME_TYPE } },
    ).blob();
    await this.playFile(session, file);
    this.remember(session.key, file);
  }

  private async playFile(session: Session, file: Blob): Promise<void> {
    const url = URL.createObjectURL(file);
    session.cleanups.push(() => URL.revokeObjectURL(url));
    await this.playSpeech(session, url);
  }

  private remember(key: string, file: Blob): void {
    this.cache.delete(key);
    this.cache.set(key, file);
    if (this.cache.size > CACHED_MESSAGES) {
      const oldest = this.cache.keys().next().value;
      if (oldest !== undefined) this.cache.delete(oldest);
    }
  }

  private setState(state: ReadAloudState): void {
    this.state = state;
    this.listeners.forEach((listener) => listener());
  }
}

export const readAloudPlayer = new ReadAloudPlayer();
