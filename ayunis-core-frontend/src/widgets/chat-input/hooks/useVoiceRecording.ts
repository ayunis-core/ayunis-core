import { useState, useRef, useCallback, useEffect } from 'react';

type RecordingState = 'idle' | 'starting' | 'recording' | 'transcribing';

const MAX_RECORDING_DURATION_MS = 5 * 60 * 1000; // 5 minutes
const MIN_RECORDING_DURATION_MS = 1000; // 1 second

function getSupportedMimeType(): string | null {
  if (MediaRecorder.isTypeSupported('audio/webm')) {
    return 'audio/webm';
  }
  if (MediaRecorder.isTypeSupported('audio/mp4')) {
    return 'audio/mp4';
  }
  return null;
}

function getFileExtension(mimeType: string): string {
  if (mimeType.includes('mp4')) return 'mp4';
  return 'webm';
}

export function useVoiceRecording(
  onTranscriptionComplete: (text: string) => void,
  onError: (errorKey: string) => void,
  transcribe: (
    audioBlob: Blob,
    fileName: string,
    language?: string,
  ) => Promise<string | null>,
) {
  const [state, setState] = useState<RecordingState>('idle');
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startTimeRef = useRef<number>(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const cancelledRef = useRef<boolean>(false);

  const cleanup = useCallback(() => {
    cancelledRef.current = true;
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    mediaRecorderRef.current = null;
    chunksRef.current = [];
  }, []);

  // Clean up on component unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  const processRecording = useCallback(
    async (chunks: Blob[], mimeType: string) => {
      const blob = new Blob(chunks, { type: mimeType });
      const ext = getFileExtension(mimeType);
      const fileName = `recording.${ext}`;

      setState('transcribing');
      const text = await transcribe(blob, fileName);

      // Check if cancelled during transcription (e.g., component unmounted)
      if (cancelledRef.current) {
        return;
      }

      if (text === null) {
        // API error
        onError('chatInput.transcriptionFailed');
      } else if (text) {
        // Successful transcription with content
        onTranscriptionComplete(text);
      }
      // Empty string means successful transcription with no detected speech - do nothing
      setState('idle');
    },
    [transcribe, onTranscriptionComplete, onError],
  );

  const startRecording = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      onError('chatInput.recordingNotSupported');
      return;
    }

    // Prevent multiple concurrent startRecording calls
    if (state !== 'idle') {
      return;
    }

    setState('starting');
    cancelledRef.current = false;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // If cancelled during getUserMedia (e.g., component unmounted), clean up and return
      if (cancelledRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }

      streamRef.current = stream;

      const mimeType = getSupportedMimeType();
      if (!mimeType) {
        stream.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        setState('idle');
        onError('chatInput.recordingNotSupported');
        return;
      }

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];
      startTimeRef.current = Date.now();

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onerror = () => {
        cleanup();
        setState('idle');
        onError('chatInput.transcriptionFailed');
      };

      mediaRecorder.onstop = () => {
        // If cleanup was called (e.g., unmount), skip processing entirely
        if (cancelledRef.current) {
          return;
        }

        const duration = Date.now() - startTimeRef.current;
        const chunks = [...chunksRef.current];

        // Stop all tracks
        stream.getTracks().forEach((track) => track.stop());
        streamRef.current = null;

        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }

        // Discard very short recordings
        if (duration < MIN_RECORDING_DURATION_MS) {
          setState('idle');
          return;
        }

        void processRecording(chunks, mimeType);
      };

      mediaRecorder.start();
      setState('recording');

      // Auto-stop after max duration
      timeoutRef.current = setTimeout(() => {
        if (
          mediaRecorderRef.current &&
          mediaRecorderRef.current.state === 'recording'
        ) {
          mediaRecorderRef.current.stop();
        }
      }, MAX_RECORDING_DURATION_MS);
    } catch (error) {
      cleanup();
      setState('idle');
      // NotAllowedError is thrown when microphone permission is denied
      if (error instanceof Error && error.name === 'NotAllowedError') {
        onError('chatInput.microphonePermissionDenied');
      } else {
        onError('chatInput.recordingNotSupported');
      }
    }
  }, [state, onError, processRecording, cleanup]);

  const stopRecording = useCallback(() => {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state === 'recording'
    ) {
      mediaRecorderRef.current.stop();
    }
  }, []);

  const isSupported =
    typeof window !== 'undefined' &&
    !!navigator.mediaDevices?.getUserMedia &&
    typeof MediaRecorder !== 'undefined';

  return {
    state,
    isStarting: state === 'starting',
    isRecording: state === 'recording',
    isTranscribing: state === 'transcribing',
    startRecording,
    stopRecording,
    isSupported,
  };
}
