import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { wrapProviderFailure } from 'src/common/errors/wrap-provider-failure.helper';
import type { AnnouncableReleaseNote } from 'src/domain/release-notes/application/models/announcable-release-note';
import {
  AnnouncableFeed,
  type AnnouncableImageDownload,
} from 'src/domain/release-notes/application/ports/announcable-feed.port';
import {
  AnnouncableFeedInvalidError,
  AnnouncableRequestRejectedError,
} from 'src/domain/release-notes/application/release-notes.errors';

const PROVIDER = { provider: 'announcable' };
const REQUEST_TIMEOUT_MS = 15_000;
/** Far beyond the release notes there are; a feed this long is broken. */
const MAX_PAGES = 100;
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

/**
 * Announcable's widget feed, read page by page. Past its last page the feed
 * answers with the last page again, so reading stops at the first page that
 * brings no new note.
 */
@Injectable()
export class AnnouncableHttpFeed extends AnnouncableFeed {
  private readonly logger = new Logger(AnnouncableHttpFeed.name);

  constructor(private readonly configService: ConfigService) {
    super();
  }

  /** Announcable, or the stand-in of the e2e tests. */
  private get origin(): string {
    return this.configService.get<string>(
      'releaseNotes.announcableOrigin',
    ) as string;
  }

  async fetchReleaseNotes(orgId: string): Promise<AnnouncableReleaseNote[]> {
    const notes = new Map<string, AnnouncableReleaseNote>();
    for (let page = 1; page <= MAX_PAGES; page++) {
      const pageNotes = await this.fetchPage(orgId, page);
      const newNotes = pageNotes.filter((note) => !notes.has(note.id));
      if (newNotes.length === 0) {
        this.logger.debug(
          { pages: page, notes: notes.size },
          'Read Announcable feed',
        );
        return [...notes.values()];
      }
      for (const note of newNotes) notes.set(note.id, note);
    }
    throw new AnnouncableFeedInvalidError(`more than ${MAX_PAGES} pages`);
  }

  async downloadImage(url: string): Promise<AnnouncableImageDownload> {
    if (!URL.canParse(url) || new URL(url).origin !== this.origin) {
      return { status: 'rejected', reason: 'the image is not on Announcable' };
    }
    const response = await request(url);
    if (!response.ok) {
      throwIfUnavailable(response.status);
      return {
        status: 'rejected',
        reason: `Announcable answered ${response.status}`,
      };
    }
    const declaredLength = Number(response.headers.get('content-length'));
    if (declaredLength > MAX_IMAGE_BYTES) return tooLarge();
    const data = Buffer.from(await response.arrayBuffer());
    return data.length > MAX_IMAGE_BYTES
      ? tooLarge()
      : { status: 'downloaded', data };
  }

  private async fetchPage(
    orgId: string,
    page: number,
  ): Promise<AnnouncableReleaseNote[]> {
    const response = await request(
      `${this.origin}/api/release-notes/${encodeURIComponent(orgId)}?for=widget&page=${page}`,
    );
    if (!response.ok) {
      throwIfUnavailable(response.status);
      throw new AnnouncableRequestRejectedError(response.status);
    }
    const body = (await response.json()) as { data?: unknown };
    if (!Array.isArray(body.data)) {
      throw new AnnouncableFeedInvalidError('no data list');
    }
    return body.data.map(toReleaseNote);
  }
}

/**
 * Redirects are not followed, so a download never leaves the Announcable
 * host it was checked against; a redirect answers like any other 3xx.
 */
async function request(url: string): Promise<Response> {
  try {
    return await fetch(url, {
      headers: { Accept: 'application/json, image/*' },
      redirect: 'manual',
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (error) {
    throw wrapProviderFailure(error, PROVIDER) ?? error;
  }
}

/** Server errors, timeouts and rate limits are worth retrying later. */
function throwIfUnavailable(status: number): void {
  const unavailable = wrapProviderFailure({ status }, PROVIDER);
  if (unavailable) throw unavailable;
}

function tooLarge(): AnnouncableImageDownload {
  return {
    status: 'rejected',
    reason: `the image is larger than ${MAX_IMAGE_BYTES} bytes`,
  };
}

function toReleaseNote(item: unknown): AnnouncableReleaseNote {
  const note = (item ?? {}) as Record<string, unknown>;
  return {
    id: requiredText(note, 'id'),
    title: textField(note, 'title'),
    text: optionalText(note.text),
    imageSrc: optionalText(note.imageSrc),
    mediaLink: optionalText(note.media_link),
    lastUpdateOn: requiredText(note, 'last_update_on'),
    ctaLabelOverride: optionalText(note.cta_label_override),
    ctaHrefOverride: optionalText(note.cta_href_override),
  };
}

/** An empty title is the sync's to skip; only identity fields must be set. */
function textField(note: Record<string, unknown>, field: string): string {
  const value = note[field];
  if (typeof value !== 'string') {
    throw new AnnouncableFeedInvalidError(`a note without ${field}`);
  }
  return value;
}

function requiredText(note: Record<string, unknown>, field: string): string {
  const value = textField(note, field);
  if (value.length === 0) {
    throw new AnnouncableFeedInvalidError(`a note without ${field}`);
  }
  return value;
}

function optionalText(value: unknown): string {
  return typeof value === 'string' ? value : '';
}
