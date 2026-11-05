import { useCallback, useEffect, useRef, useState } from 'react';
import {
  uploadSourceFile,
  type DirectSourceUploadTarget,
} from './upload-source-file';

/** Local placeholder kept until the completed upload is reconciled with server data. */
export interface PendingSourceUpload {
  id: string;
  fileName: string;
  /** Fraction of bytes stored so far, 0..1. */
  progress: number;
}

interface DirectSourceUploadCallbacks<TResult> {
  onSuccess?: (result: TResult, file: File) => void | Promise<void>;
  onError?: (error: unknown, file: File) => void;
}

/**
 * Runs the direct upload flow for one target: reserve a session, transfer the
 * bytes to storage with progress, then let the target create and queue the
 * source. A failed transfer or completion aborts the session best-effort so
 * nothing lingers in storage.
 */
export function useDirectSourceUpload<TResult>(
  target: DirectSourceUploadTarget<TResult>,
  callbacks: DirectSourceUploadCallbacks<TResult> = {},
) {
  const [uploads, setUploads] = useState<PendingSourceUpload[]>([]);
  // Callers pass fresh objects every render; an in-flight upload keeps
  // using the latest ones without re-creating the upload function.
  const targetRef = useRef(target);
  const callbacksRef = useRef(callbacks);
  useEffect(() => {
    targetRef.current = target;
    callbacksRef.current = callbacks;
  });

  const uploadAsync = useCallback(async (file: File): Promise<TResult> => {
    const localId = crypto.randomUUID();
    const controller = new AbortController();
    const setProgress = (progress: number) =>
      setUploads((current) =>
        current.map((upload) =>
          upload.id === localId ? { ...upload, progress } : upload,
        ),
      );
    setUploads((current) => [
      ...current,
      { id: localId, fileName: file.name, progress: 0 },
    ]);

    try {
      const result = await uploadSourceFile(
        file,
        targetRef.current,
        controller.signal,
        setProgress,
      ).catch((error: unknown) => {
        callbacksRef.current.onError?.(error, file);
        throw error;
      });
      try {
        await callbacksRef.current.onSuccess?.(result, file);
      } catch {
        // A failed list refresh cannot undo a successfully completed upload.
      }
      return result;
    } finally {
      setUploads((current) =>
        current.filter((upload) => upload.id !== localId),
      );
    }
  }, []);

  const upload = useCallback(
    (file: File) => {
      uploadAsync(file).catch(() => {
        // Reported through onError; callers that need the rejection use uploadAsync.
      });
    },
    [uploadAsync],
  );

  return { upload, uploadAsync, uploads, isUploading: uploads.length > 0 };
}
