import {
  threadSourcesControllerCompleteUpload,
  threadsControllerFindOne,
  threadSourcesControllerCreateUpload,
} from '@ayunis/api-client/endpoints';

export async function uploadPaneFiles(
  threadId: string,
  files: File[],
  signal: AbortSignal,
): Promise<void> {
  const { uploadSourceFile } = await import('@ayunis/api-client/source-upload');
  for (const file of files) {
    signal.throwIfAborted();
    await uploadSourceFile(
      file,
      {
        createSession: (file, signal) =>
          threadSourcesControllerCreateUpload(
            threadId,
            {
              fileName: file.name,
              mimeType: file.type,
              fileSize: file.size,
            },
            signal,
          ),
        complete: (uploadId, signal) =>
          threadSourcesControllerCompleteUpload(threadId, uploadId, signal),
      },
      signal,
    );
  }
}

export async function waitForPaneFiles(threadId: string, signal: AbortSignal) {
  let thread = await threadsControllerFindOne(threadId, signal);
  while (thread.sources.some(({ status }) => status === 'processing')) {
    await waitForSourceUpdate(signal);
    thread = await threadsControllerFindOne(threadId, signal);
  }
  return thread;
}

function waitForSourceUpdate(signal: AbortSignal): Promise<void> {
  signal.throwIfAborted();
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => {
      signal.removeEventListener('abort', stop);
      resolve();
    }, 2000);
    function stop() {
      window.clearTimeout(timer);
      reject(new DOMException('Upload aborted', 'AbortError'));
    }
    signal.addEventListener('abort', stop, { once: true });
  });
}
