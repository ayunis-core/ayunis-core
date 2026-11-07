import type { AnnouncableReleaseNote } from 'src/domain/release-notes/application/models/announcable-release-note';

export type AnnouncableImageDownload =
  | { readonly status: 'downloaded'; readonly data: Buffer }
  | { readonly status: 'rejected'; readonly reason: string };

/** Release notes as Announcable publishes them for its widget. */
export abstract class AnnouncableFeed {
  /**
   * Every release note of the Announcable org, across all pages of the feed.
   * Throws when the feed cannot be read completely, so a partial read never
   * looks like deleted notes.
   */
  abstract fetchReleaseNotes(orgId: string): Promise<AnnouncableReleaseNote[]>;

  /**
   * Throws on failures worth retrying with the next sync (connection, timeout,
   * server error). A rejection (a client error, a foreign host, an oversized
   * image) is final.
   */
  abstract downloadImage(url: string): Promise<AnnouncableImageDownload>;
}
