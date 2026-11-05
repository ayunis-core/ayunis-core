import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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

interface DirectSourceUploadOptions {
  /**
   * Owner of the placeholders, e.g. the thread id. A page that stays mounted
   * while the user moves to another resource only sees the uploads of the
   * resource it currently shows.
   */
  scope?: string;
}

interface ScopedSourceUpload extends PendingSourceUpload {
  scope: string | undefined;
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
  { scope }: DirectSourceUploadOptions = {},
) {
  const [uploads, setUploads] = useState<ScopedSourceUpload[]>([]);
  // Callers pass fresh objects every render; the refs let the stable upload
  // function read the render that received the file.
  const targetRef = useRef(target);
  const callbacksRef = useRef(callbacks);
  const scopeRef = useRef(scope);
  useEffect(() => {
    targetRef.current = target;
    callbacksRef.current = callbacks;
    scopeRef.current = scope;
  });

  const uploadAsync = useCallback(async (file: File): Promise<TResult> => {
    const localId = crypto.randomUUID();
    const controller = new AbortController();
    // Bound to the resource that received the file: if the host page moves
    // on to another one meanwhile, the result still reconciles the original.
    const uploadTarget = targetRef.current;
    const { onSuccess, onError } = callbacksRef.current;
    const uploadScope = scopeRef.current;
    // A retried part reports its bytes from zero again; the bar never backs up.
    const setProgress = (progress: number) =>
      setUploads((current) =>
        current.map((upload) =>
          upload.id === localId
            ? { ...upload, progress: Math.max(upload.progress, progress) }
            : upload,
        ),
      );
    setUploads((current) => [
      ...current,
      { id: localId, fileName: file.name, progress: 0, scope: uploadScope },
    ]);

    try {
      const result = await uploadSourceFile(
        file,
        uploadTarget,
        controller.signal,
        setProgress,
      ).catch((error: unknown) => {
        onError?.(error, file);
        throw error;
      });
      try {
        await onSuccess?.(result, file);
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

  const visibleUploads = useMemo(
    () => uploads.filter((upload) => upload.scope === scope),
    [uploads, scope],
  );

  return {
    upload,
    uploadAsync,
    uploads: visibleUploads,
    isUploading: visibleUploads.length > 0,
  };
}
