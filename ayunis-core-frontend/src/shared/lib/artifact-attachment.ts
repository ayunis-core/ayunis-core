import { threadArtifactsControllerAttach } from '@/shared/api/generated/ayunisCoreAPI';
import extractErrorData from '@/shared/api/extract-error-data';

/**
 * Links the artifacts to the chat one after another. Returns false, after
 * reporting the error, when one of them could not be linked, or when the
 * user cancelled in between.
 */
export async function attachArtifacts(
  threadId: string,
  artifactIds: string[],
  isCancelled: () => boolean,
  onError: (error: unknown) => void,
): Promise<boolean> {
  for (const artifactId of artifactIds) {
    if (isCancelled()) return false;
    try {
      await threadArtifactsControllerAttach(threadId, artifactId);
    } catch (error) {
      console.error('Failed to attach artifact:', error);
      onError(error);
      return false;
    }
  }
  return true;
}

/** The `chat` namespace message for an artifact that could not be attached. */
export function artifactAttachErrorKey(error: unknown): string {
  try {
    switch (extractErrorData(error).code) {
      case 'ARTIFACT_NOT_FOUND':
      case 'THREAD_NOT_FOUND':
        return 'chat.errorArtifactUnavailable';
      case 'ARTIFACT_OUTSIDE_CHAT_SCOPE':
        return 'chat.errorArtifactOutsideScope';
      case 'ARTIFACT_CHAT_MODE_MISMATCH':
        return 'chat.errorArtifactModeMismatch';
    }
  } catch {
    // Non-Axios failure: fall through to the generic message.
  }
  return 'chat.errorAttachArtifact';
}
