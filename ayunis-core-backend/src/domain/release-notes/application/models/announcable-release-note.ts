/**
 * The fields of an Announcable release note the sync relies on. Optional
 * fields Announcable sends empty are empty strings.
 */
export interface AnnouncableReleaseNote {
  readonly id: string;
  readonly title: string;
  readonly text: string;
  /** A signed URL that expires after 24 hours. */
  readonly imageSrc: string;
  /** A Loom embed URL. */
  readonly mediaLink: string;
  readonly lastUpdateOn: string;
  readonly ctaLabelOverride: string;
  readonly ctaHrefOverride: string;
}
