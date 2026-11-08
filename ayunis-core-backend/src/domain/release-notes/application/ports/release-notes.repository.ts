import type { UUID } from 'crypto';
import type { ReleaseNote } from 'src/domain/release-notes/domain/release-note.entity';

export abstract class ReleaseNotesRepository {
  /** Every stored note; there are as many as Announcable has, a few dozen. */
  abstract findAll(): Promise<ReleaseNote[]>;

  abstract insertMany(notes: ReleaseNote[]): Promise<void>;

  /** Updates a stored note; never creates one. */
  abstract update(note: ReleaseNote): Promise<void>;

  abstract deleteByIds(ids: UUID[]): Promise<void>;
}
