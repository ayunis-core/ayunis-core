import type {
  SharePointLocationKind,
  SharePointResolutionOutcome,
} from 'src/domain/connectors/application/models/sharepoint-location';
import type { SharePointGrant } from 'src/domain/connectors/domain/microsoft-365/sharepoint-grant';

export type SharePointLocationResolution =
  | {
      outcome: SharePointResolutionOutcome.FOUND;
      kind: SharePointLocationKind;
      name: string;
      /** SharePoint's own URL of the location, to add as the synced location. */
      location: string;
    }
  | {
      outcome:
        | SharePointResolutionOutcome.NOT_GRANTED
        | SharePointResolutionOutcome.NOT_FOUND_OR_NOT_GRANTED;
      grant: SharePointGrant;
    }
  | {
      outcome:
        | SharePointResolutionOutcome.NOT_FOUND
        | SharePointResolutionOutcome.UNSUPPORTED_URL;
    };
