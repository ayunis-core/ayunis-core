import { useLayoutEffect, useRef, useState } from 'react';

type RecordingState = 'idle' | 'starting' | 'recording' | 'transcribing';
type Transcribe = (
  audio: Blob,
  filename: string,
  language?: string,
) => Promise<string | null>;

interface Capture {
  controller: AbortController;
  recorder?: MediaRecorder;
  release?: () => void;
}

const MAX_RECORDING_DURATION_MS = 5 * 60 * 1000;
const MIN_RECORDING_DURATION_MS = 1000;
// Chromium can emit only the container header when no audio frame arrived.
const MIN_AUDIO_BLOB_BYTES = 2048;

function supportedMimeType(): string | undefined {
  return ['audio/webm', 'audio/mp4'].find((type) =>
    MediaRecorder.isTypeSupported(type),
  );
}

function stopTracks(stream: MediaStream) {
  stream.getTracks().forEach((track) => track.stop());
}

function record(
  capture: Capture,
  stream: MediaStream,
  mimeType: string,
  received: (blob: Blob) => void,
  failed: () => void,
) {
  const recorder = new MediaRecorder(stream, { mimeType });
  capture.recorder = recorder;
  const chunks: Blob[] = [];
  let processed = false;
  const started = Date.now();

  recorder.ondataavailable = ({ data }) => {
    if (data.size) chunks.push(data);
    if (
      recorder.state !== 'inactive' ||
      processed ||
      capture.controller.signal.aborted
    )
      return;
    processed = true;
    const duration = Date.now() - started;
    received(
      new Blob(duration < MIN_RECORDING_DURATION_MS ? [] : chunks, {
        type: mimeType,
      }),
    );
  };

  // Safari can emit onstop before the final data event.
  recorder.onstop = () => capture.release?.();
  recorder.onerror = failed;
  const timeout = setTimeout(
    () => stopRecording(capture),
    MAX_RECORDING_DURATION_MS,
  );
  capture.release = () => {
    capture.release = undefined;
    clearTimeout(timeout);
    stopTracks(stream);
  };
  recorder.start();
}

function stopRecording(capture?: Capture) {
  if (capture?.recorder?.state === 'recording') capture.recorder.stop();
}

interface CaptureHandlers {
  ready: () => void;
  received: (blob: Blob) => void;
  failed: (key: string) => void;
}

async function startCapture(capture: Capture, handlers: CaptureHandlers) {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    if (capture.controller.signal.aborted) {
      stopTracks(stream);
      return;
    }

    capture.release = () => stopTracks(stream);
    const mimeType = supportedMimeType();
    if (!mimeType) {
      handlers.failed('chatInput.recordingNotSupported');
      return;
    }

    record(capture, stream, mimeType, handlers.received, () =>
      handlers.failed('chatInput.transcriptionFailed'),
    );
    handlers.ready();
  } catch (error) {
    const denied = error instanceof Error && error.name === 'NotAllowedError';
    handlers.failed(
      denied
        ? 'chatInput.microphonePermissionDenied'
        : 'chatInput.recordingNotSupported',
    );
  }
}

function dispose(capture?: Capture) {
  capture?.controller.abort();
  capture?.release?.();
}

async function transcribeCapture(
  capture: Capture,
  blob: Blob,
  transcribe: Transcribe,
  handlers: { received: (text: string | null) => void; started: () => void },
) {
  if (blob.size < MIN_AUDIO_BLOB_BYTES) {
    handlers.received('');
    return;
  }

  const fileName = blob.type.includes('mp4')
    ? 'recording.mp4'
    : 'recording.webm';
  handlers.started();
  const text = await transcribe(blob, fileName).catch(() => null);
  if (!capture.controller.signal.aborted) handlers.received(text);
}

export function useVoiceRecording(
  onTranscriptionComplete: (text: string) => void,
  onError: (errorKey: string) => void,
  transcribe: Transcribe,
) {
  const [state, setState] = useState<RecordingState>('idle');
  const current = useRef<Capture | undefined>(undefined);
  useLayoutEffect(() => () => dispose(current.current), []);

  async function startRecording() {
    if (current.current) return;
    const capture: Capture = { controller: new AbortController() };
    current.current = capture;
    setState('starting');

    function finish() {
      dispose(capture);
      current.current = undefined;
      setState('idle');
    }

    await startCapture(capture, {
      ready: () => setState('recording'),
      received: (blob) => {
        void transcribeCapture(capture, blob, transcribe, {
          started: () => setState('transcribing'),
          received: (text) => {
            finish();
            if (text === null) onError('chatInput.transcriptionFailed');
            else if (text) onTranscriptionComplete(text);
          },
        });
      },
      failed: (key) => {
        if (capture.controller.signal.aborted) return;
        finish();
        onError(key);
      },
    });
  }

  return {
    state,
    isStarting: state === 'starting',
    isRecording: state === 'recording',
    isTranscribing: state === 'transcribing',
    startRecording,
    stopRecording: () => stopRecording(current.current),
    isSupported: typeof MediaRecorder !== 'undefined',
  };
}
