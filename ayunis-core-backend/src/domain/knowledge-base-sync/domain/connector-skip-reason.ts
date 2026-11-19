import { ConnectorItemUnprocessableReason } from 'src/domain/connectors/domain/sync/connector-item';
import { SyncedFileSkipReason } from './synced-file-skip-reason.enum';

const SKIP_REASONS: Record<
  ConnectorItemUnprocessableReason,
  SyncedFileSkipReason
> = {
  [ConnectorItemUnprocessableReason.UNSUPPORTED_TYPE]:
    SyncedFileSkipReason.UNSUPPORTED_TYPE,
  [ConnectorItemUnprocessableReason.TOO_LARGE]: SyncedFileSkipReason.TOO_LARGE,
  [ConnectorItemUnprocessableReason.ENCRYPTED]: SyncedFileSkipReason.ENCRYPTED,
};

/** Why a file is skipped that its connector reports unprocessable. */
export function skipReasonOf(
  reason: ConnectorItemUnprocessableReason,
): SyncedFileSkipReason {
  return SKIP_REASONS[reason];
}
