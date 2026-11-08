import type { UUID } from 'crypto';
import type { AnnouncableReleaseNote } from 'src/domain/release-notes/application/models/announcable-release-note';
import type { AnnouncableFeed } from 'src/domain/release-notes/application/ports/announcable-feed.port';
import { ReleaseNotesRepository } from 'src/domain/release-notes/application/ports/release-notes.repository';
import { ReleaseNote } from 'src/domain/release-notes/domain/release-note.entity';

export const TEST_ANNOUNCABLE_ORG_ID = 'bbcb0cc9-f4b8-4e54-a2a7-bfcac8b98154';
export const TEST_ANNOUNCABLE_ID = 'c76cd1b4-3b80-4666-bc4f-913161122056';
export const TEST_RELEASE_NOTE_ID =
  '55555555-5555-4555-8555-555555555555' as UUID;
export const TEST_IMAGE_PATH =
  'https://release-notes.locaboo.de/api/img/release-notes/cb6b6d9a-2662-4989-af61-7907997c2db7/ba4574f9-5d9b-4f4b-8a7f-3850460981a8.webp';
export const TEST_IMAGE_SRC = `${TEST_IMAGE_PATH}?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Date=20261107T170718Z&X-Amz-Expires=86400&X-Amz-SignedHeaders=host&X-Amz-Signature=f56793b60ec2`;
export const TEST_LOOM_URL =
  'https://www.loom.com/embed/198aa66c0e684eb891a4a6d4ee74512d';

/** A note as the feed sends it; without media unless overridden. */
export function anAnnouncableNote(
  overrides: Partial<AnnouncableReleaseNote> = {},
): AnnouncableReleaseNote {
  return {
    id: TEST_ANNOUNCABLE_ID,
    title: 'Auto und Max Modus – Modellauswahl leicht gemacht',
    text: 'Neue Chats lassen sich jetzt noch einfacher starten.',
    imageSrc: '',
    mediaLink: '',
    lastUpdateOn: '2026-11-05 14:13:59.695765 +0000 UTC',
    ctaLabelOverride: '',
    ctaHrefOverride: '',
    ...overrides,
  };
}

export function aReleaseNote(
  overrides: Partial<ConstructorParameters<typeof ReleaseNote>[0]> = {},
): ReleaseNote {
  return new ReleaseNote({
    id: TEST_RELEASE_NOTE_ID,
    announcableId: TEST_ANNOUNCABLE_ID,
    headline: 'Auto und Max Modus – Modellauswahl leicht gemacht',
    body: 'Neue Chats lassen sich jetzt noch einfacher starten.',
    lastUpdateOn: '2026-11-05 14:13:59.695765 +0000 UTC',
    ...overrides,
  });
}

/** Keeps notes in memory, so specs assert what is stored, not which calls ran. */
export class InMemoryReleaseNotesRepository extends ReleaseNotesRepository {
  readonly notes = new Map<UUID, ReleaseNote>();

  findAll(): Promise<ReleaseNote[]> {
    return Promise.resolve([...this.notes.values()]);
  }

  insertMany(notes: ReleaseNote[]): Promise<void> {
    for (const note of notes) this.notes.set(note.id, note);
    return Promise.resolve();
  }

  update(note: ReleaseNote): Promise<void> {
    if (this.notes.has(note.id)) this.notes.set(note.id, note);
    return Promise.resolve();
  }

  deleteByIds(ids: UUID[]): Promise<void> {
    for (const id of ids) this.notes.delete(id);
    return Promise.resolve();
  }

  byAnnouncableId(announcableId: string): ReleaseNote | undefined {
    return [...this.notes.values()].find(
      (note) => note.announcableId === announcableId,
    );
  }
}

export function createMockAnnouncableFeed(): jest.Mocked<AnnouncableFeed> {
  return {
    fetchReleaseNotes: jest.fn().mockResolvedValue([]),
    downloadImage: jest.fn().mockResolvedValue({
      status: 'rejected',
      reason: 'not stubbed',
    }),
  };
}
