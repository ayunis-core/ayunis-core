import {
  SyncedLocation,
  type SyncedLocationParams,
} from './synced-location.entity';
import { SyncedLocationProvider } from './synced-location-provider.enum';

/** The deepest a website is crawled: the root's links and theirs. */
export const WEB_SYNC_MAX_DEPTH = 2;

/**
 * A website, crawled from its URL (`location`) without a connection: every
 * page reached and every PDF they link to is a file.
 */
export class WebSyncedLocation extends SyncedLocation {
  readonly provider = SyncedLocationProvider.WEB;
  /** Link depth followed from the URL, 0 to {@link WEB_SYNC_MAX_DEPTH}. */
  readonly depth: number;

  constructor(params: SyncedLocationParams & { depth: number }) {
    super(params);
    this.depth = params.depth;
  }
}
