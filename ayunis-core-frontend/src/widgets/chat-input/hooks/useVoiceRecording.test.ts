import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useVoiceRecording } from '@/widgets/chat-input/hooks/useVoiceRecording';

// Chromium's MediaRecorder emits exactly this many bytes (the WebM container
// header) when the track delivered no audio frames before stop().
const HEADER_ONLY_WEBM_BYTES = 110;
const ONE_SECOND_WEBM_BYTES = 10_922;

type RecordingState = 'inactive' | 'recording';

const recorders: FakeMediaRecorder[] = [];

class FakeMediaRecorder {
  static readonly isTypeSupported = (mimeType: string) =>
    mimeType === 'audio/webm';

  state: RecordingState = 'inactive';
  ondataavailable: ((event: { data: Blob }) => void) | null = null;
  onstop: (() => void) | null = null;
  onerror: (() => void) | null = null;

  constructor() {
    recorders.push(this);
  }

  start() {
    this.state = 'recording';
  }

  stop() {
    this.state = 'inactive';
  }

  finish(bytes: number, order: 'data-first' | 'stop-first') {
    this.stop();
    const data = new Blob([new Uint8Array(bytes)], { type: 'audio/webm' });
    if (order === 'data-first') {
      this.ondataavailable?.({ data });
      this.onstop?.();
    } else {
      this.onstop?.();
      this.ondataavailable?.({ data });
    }
  }
}

describe('useVoiceRecording', () => {
  const onTranscriptionComplete = vi.fn();
  const onError = vi.fn();
  const transcribe = vi.fn<(blob: Blob, fileName: string) => Promise<string>>();

  beforeEach(() => {
    vi.useFakeTimers();
    transcribe.mockResolvedValue('hello');
    vi.stubGlobal('MediaRecorder', FakeMediaRecorder);
    vi.stubGlobal('navigator', {
      mediaDevices: {
        getUserMedia: vi.fn().mockResolvedValue({
          getTracks: () => [{ stop: vi.fn() }],
        }),
      },
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.clearAllMocks();
    recorders.length = 0;
  });

  async function record(
    durationMs: number,
    bytes: number,
    order: 'data-first' | 'stop-first' = 'data-first',
  ) {
    const { result } = renderHook(() =>
      useVoiceRecording(onTranscriptionComplete, onError, transcribe),
    );
    await act(() => result.current.startRecording());
    vi.advanceTimersByTime(durationMs);
    await act(async () => {
      recorders[0].finish(bytes, order);
      await Promise.resolve();
    });
    return result;
  }

  it.each(['data-first', 'stop-first'] as const)(
    'skips transcription for a header-only recording (%s)',
    async (order) => {
      const result = await record(2000, HEADER_ONLY_WEBM_BYTES, order);

      expect(transcribe).not.toHaveBeenCalled();
      expect(onError).not.toHaveBeenCalled();
      expect(result.current.state).toBe('idle');
    },
  );

  it.each(['data-first', 'stop-first'] as const)(
    'transcribes a short recording with audio (%s)',
    async (order) => {
      const result = await record(1200, ONE_SECOND_WEBM_BYTES, order);

      expect(transcribe).toHaveBeenCalledWith(
        expect.objectContaining({ size: ONE_SECOND_WEBM_BYTES }),
        'recording.webm',
      );
      expect(onTranscriptionComplete).toHaveBeenCalledWith('hello');
      expect(onError).not.toHaveBeenCalled();
      expect(result.current.state).toBe('idle');
    },
  );

  it('skips transcription when stopped immediately', async () => {
    const result = await record(50, ONE_SECOND_WEBM_BYTES);

    expect(transcribe).not.toHaveBeenCalled();
    expect(onError).not.toHaveBeenCalled();
    expect(result.current.state).toBe('idle');
  });
});
