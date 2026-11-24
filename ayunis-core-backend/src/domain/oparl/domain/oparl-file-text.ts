/** Where the text of a mirrored file stands; a file without a row is still to be read. */
export enum OparlFileTextStatus {
  EXTRACTED = 'extracted',
  /** Kept as metadata only, for `skipReason`, until the file changes. */
  SKIPPED = 'skipped',
  /** Could not be read for now (unreachable, OCR unavailable); tried again on later runs. */
  FAILED = 'failed',
}

export enum OparlFileSkipReason {
  TOO_LARGE = 'too_large',
  TOO_MANY_PAGES = 'too_many_pages',
  UNSUPPORTED_TYPE = 'unsupported_type',
  /** Damaged, password-protected or without any text, even after OCR. */
  UNREADABLE = 'unreadable',
}

/** A failed file is tried on this many document runs before it waits for a change. */
export const OPARL_FILE_MAX_ATTEMPTS = 3;
