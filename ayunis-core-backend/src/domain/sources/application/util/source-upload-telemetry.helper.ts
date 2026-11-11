import { Appsignal } from '@appsignal/nodejs';
import type { SourceUploadSession } from 'src/domain/sources/domain/upload/source-upload-session.entity';

const SOURCE_UPLOAD_SESSION_COUNTER = 'source_upload_session_count';

type SourceUploadOutcome = 'created' | 'completed' | 'aborted' | 'expired';

/**
 * Call only where a session was saved or a guarded transition out of PENDING
 * was won, so each session is counted once per outcome however often a
 * request is replayed.
 */
export function recordSourceUploadOutcome(
  outcome: SourceUploadOutcome,
  session: Pick<SourceUploadSession, 'targetType' | 'multipart'>,
): void {
  try {
    const client = Appsignal.client as typeof Appsignal.client | undefined;
    if (!client?.isActive) return;
    client.metrics().incrementCounter(SOURCE_UPLOAD_SESSION_COUNTER, 1, {
      outcome,
      target_type: session.targetType,
      multipart: String(session.multipart),
    });
  } catch {
    // Telemetry must never fail or alter an upload.
  }
}
