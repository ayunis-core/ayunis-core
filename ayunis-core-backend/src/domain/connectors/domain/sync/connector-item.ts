/** Why the provider already knows an item cannot be processed. */
export enum ConnectorItemUnprocessableReason {
  UNSUPPORTED_TYPE = 'unsupported_type',
  TOO_LARGE = 'too_large',
  ENCRYPTED = 'encrypted',
}

/** A file below a synced location, as the provider lists it; never a folder. */
export interface ConnectorItem {
  /** Stable across renames and moves. */
  id: string;
  /** Path below the location, including the file name. */
  path: string;
  name: string;
  /** Changes whenever the content changes, and only then. */
  version: string;
  size: number;
  unprocessableReason?: ConnectorItemUnprocessableReason;
}
