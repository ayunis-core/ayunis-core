export enum AdventCalendarMediaType {
  IMAGE = 'image',
  VIMEO = 'vimeo',
}

export interface AdventCalendarImage {
  readonly type: AdventCalendarMediaType.IMAGE;
  readonly storageKey: string;
  readonly contentType: string;
}

/** Embedded as `https://player.vimeo.com/video/<videoId>?dnt=1[&h=<hash>]`. */
export interface AdventCalendarVimeoVideo {
  readonly type: AdventCalendarMediaType.VIMEO;
  readonly videoId: string;
  /** The privacy hash of an unlisted video. */
  readonly hash: string | null;
}

export type AdventCalendarMedia =
  AdventCalendarImage | AdventCalendarVimeoVideo;

const VIMEO_URLS = [
  /^https:\/\/vimeo\.com\/(\d{1,20})(?:\/([0-9a-zA-Z]{1,64}))?$/,
  /^https:\/\/player\.vimeo\.com\/video\/(\d{1,20})(?:\?h=([0-9a-zA-Z]{1,64}))?$/,
];

/**
 * The video of `https://vimeo.com/<id>`, `https://vimeo.com/<id>/<hash>` or
 * `https://player.vimeo.com/video/<id>[?h=<hash>]`; null for anything else.
 */
export function parseVimeoUrl(input: string): AdventCalendarVimeoVideo | null {
  const value = input.trim();
  for (const pattern of VIMEO_URLS) {
    const match = pattern.exec(value) as
      [string, string, string | undefined] | null;
    if (match) {
      return {
        type: AdventCalendarMediaType.VIMEO,
        videoId: match[1],
        hash: match[2] ?? null,
      };
    }
  }
  return null;
}
