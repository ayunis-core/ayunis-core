import type { SharePointGrant } from 'src/domain/connectors/providers/microsoft-365/domain/sharepoint-grant';

export enum SharePointLocationKind {
  /** Every document library of the site. */
  SITE = 'site',
  LIBRARY = 'library',
  FOLDER = 'folder',
}

/** A SharePoint location with the Graph IDs it is synced by. */
export type SharePointTarget = {
  name: string;
  /** SharePoint's own URL of the location. */
  webUrl: string;
  siteId: string;
} & (
  | { kind: SharePointLocationKind.SITE }
  | { kind: SharePointLocationKind.LIBRARY; driveId: string }
  | { kind: SharePointLocationKind.FOLDER; driveId: string; itemId: string }
);

export enum SharePointResolutionOutcome {
  FOUND = 'found',
  /** Graph says the app has no access: the site is not granted. */
  NOT_GRANTED = 'not_granted',
  /**
   * Where Graph answers the same for both: a library or folder the app does
   * not see in a site it is granted only parts of.
   */
  NOT_FOUND_OR_NOT_GRANTED = 'not_found_or_not_granted',
  NOT_FOUND = 'not_found',
  /** Not the URL of a site, library or folder, e.g. a file or sharing link. */
  UNSUPPORTED_URL = 'unsupported_url',
}

export type SharePointResolution =
  | { outcome: SharePointResolutionOutcome.FOUND; target: SharePointTarget }
  | {
      outcome:
        | SharePointResolutionOutcome.NOT_GRANTED
        | SharePointResolutionOutcome.NOT_FOUND_OR_NOT_GRANTED;
      /** What the Microsoft 365 admin runs to grant it. */
      grant: SharePointGrant;
    }
  | {
      outcome:
        | SharePointResolutionOutcome.NOT_FOUND
        | SharePointResolutionOutcome.UNSUPPORTED_URL;
    };
