import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { speechControllerSynthesize } from '@/shared/api';
import extractErrorData from '@/shared/api/extract-error-data';
import { showError } from '@/shared/lib/toast';

export type ReadOutLoudStatus = 'idle' | 'loading' | 'playing';

// Matches the backend's MAX_TTS_INPUT_CHARS cap
export const MAX_TTS_INPUT_CHARS = 5000;

export function useReadOutLoud() {
  const { t } = useTranslation('chat');
  const [status, setStatus] = useState<ReadOutLoudStatus>('idle');
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const reset = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
    setStatus('idle');
  }, []);

  // Stop playback and release the object URL when the message unmounts
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      if (audioRef.current) {
        audioRef.current.pause();
      }
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
      }
    };
  }, []);

  const handleError = useCallback(
    (error: unknown) => {
      try {
        const { code } = extractErrorData(error);
        if (code === 'SPEECH_SERVICE_UNAVAILABLE') {
          showError(t('chat.errorReadOutLoudUnavailable'));
        } else {
          showError(t('chat.errorReadOutLoud'));
        }
      } catch {
        // Non-Axios error (audio playback failure, etc.)
        showError(t('chat.errorReadOutLoud'));
      }
    },
    [t],
  );

  const start = useCallback(
    async (text: string) => {
      setStatus('loading');
      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const blob = await speechControllerSynthesize(
          { input: text.slice(0, MAX_TTS_INPUT_CHARS) },
          controller.signal,
        );
        if (controller.signal.aborted) return;

        const url = URL.createObjectURL(blob);
        objectUrlRef.current = url;
        const audio = new Audio(url);
        audioRef.current = audio;
        audio.onended = reset;
        audio.onerror = () => {
          reset();
          showError(t('chat.errorReadOutLoud'));
        };

        await audio.play();
        setStatus('playing');
      } catch (error) {
        if (controller.signal.aborted) return;
        reset();
        handleError(error);
      }
    },
    [handleError, reset, t],
  );

  const stop = useCallback(() => {
    abortRef.current?.abort();
    reset();
  }, [reset]);

  return { status, start, stop };
}
