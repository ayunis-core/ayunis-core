export enum ConnectorLocationOutcome {
  FOUND = 'found',
  /** The provider says the organization has no access to it. */
  NOT_GRANTED = 'not_granted',
  /** Where the provider answers the same for a missing and a hidden location. */
  NOT_FOUND_OR_NOT_GRANTED = 'not_found_or_not_granted',
  NOT_FOUND = 'not_found',
  /** Not a URL of a location the provider can sync. */
  UNSUPPORTED_URL = 'unsupported_url',
}

/** What the provider's admin does to grant access to a location. */
export interface ConnectorLocationGrant {
  /** What the grant covers, in the provider's terms. */
  scope: string;
  command: string;
}

/** A pasted location URL checked before it is added as a synced location. */
export type ConnectorLocationResolution =
  | {
      outcome: ConnectorLocationOutcome.FOUND;
      /** What was found, in the provider's terms (e.g. a folder). */
      kind: string;
      name: string;
      /** The provider's own URL of the location, to add as the synced location. */
      location: string;
    }
  | {
      outcome:
        | ConnectorLocationOutcome.NOT_GRANTED
        | ConnectorLocationOutcome.NOT_FOUND_OR_NOT_GRANTED;
      grant: ConnectorLocationGrant;
    }
  | {
      outcome:
        | ConnectorLocationOutcome.NOT_FOUND
        | ConnectorLocationOutcome.UNSUPPORTED_URL;
    };
