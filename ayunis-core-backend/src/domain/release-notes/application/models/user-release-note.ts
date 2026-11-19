import type { ReleaseNote } from 'src/domain/release-notes/domain/release-note.entity';

/** A release note as one user sees it. */
export interface UserReleaseNote {
  readonly note: ReleaseNote;
  /** Announced after the user joined and not opened by them yet. */
  readonly unread: boolean;
}
