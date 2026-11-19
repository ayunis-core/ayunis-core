import type { UUID } from 'crypto';

export enum ThreadOriginKind {
  CHAT = 'chat',
  ROUTINE = 'routine',
  NOTIFICATION = 'notification',
  RELEASE_NOTE = 'release_note',
}

/**
 * Why a thread exists; every thread has exactly one origin. Deleting the
 * routine, notification or release note a thread came from clears its id but
 * keeps the kind.
 */
export type ThreadOrigin =
  | { readonly kind: ThreadOriginKind.CHAT }
  | { readonly kind: ThreadOriginKind.ROUTINE; readonly routineId: UUID | null }
  | {
      readonly kind: ThreadOriginKind.NOTIFICATION;
      readonly notificationId: UUID | null;
    }
  | {
      readonly kind: ThreadOriginKind.RELEASE_NOTE;
      readonly releaseNoteId: UUID | null;
    };

export const CHAT_ORIGIN: ThreadOrigin = { kind: ThreadOriginKind.CHAT };
