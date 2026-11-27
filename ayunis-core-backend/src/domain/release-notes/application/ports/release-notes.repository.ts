import type { UUID } from 'crypto';
import type { UserReleaseNote } from 'src/domain/release-notes/application/models/user-release-note';
import type { ReleaseNote } from 'src/domain/release-notes/domain/release-note.entity';

export abstract class ReleaseNotesRepository {
  /** Every stored note; there are as many as Announcable has, a few dozen. */
  abstract findAll(): Promise<ReleaseNote[]>;

  abstract insertMany(notes: ReleaseNote[]): Promise<void>;

  /** Updates a stored note; never creates one. */
  abstract update(note: ReleaseNote): Promise<void>;

  abstract deleteByIds(ids: UUID[]): Promise<void>;

  /** Newest first, at most `limit`. */
  abstract findNewestForUser(
    userId: UUID,
    limit: number,
  ): Promise<UserReleaseNote[]>;

  abstract findOneForUser(
    userId: UUID,
    id: UUID,
  ): Promise<UserReleaseNote | null>;

  /** The newest note Announcable wants opened right away, read or not. */
  abstract findNewestInstantOpenForUser(
    userId: UUID,
  ): Promise<UserReleaseNote | null>;

  /** Unread notes among the newest `limit`, the ones the list shows. */
  abstract countUnread(userId: UUID, limit: number): Promise<number>;

  /** Does nothing for a note the user has read before or that is gone. */
  abstract markRead(userId: UUID, id: UUID): Promise<void>;

  /** Marks every note that is unread for the user read. */
  abstract markAllRead(userId: UUID): Promise<void>;
}
