import { Injectable } from '@nestjs/common';
import { RecordingSummary } from 'src/domain/recordings/domain/recording-summary.entity';
import type { RecordingSummaryRecord } from 'src/domain/recordings/infrastructure/persistence/local/schema/recording-summary.record';

type RecordingSummaryRow = Pick<
  RecordingSummaryRecord,
  | 'recordingId'
  | 'runId'
  | 'status'
  | 'triggeredByUserId'
  | 'content'
  | 'modelId'
  | 'modelName'
  | 'generatedAt'
  | 'failure'
>;

@Injectable()
export class RecordingSummaryMapper {
  /** Takes records and the raw rows of RETURNING clauses alike. */
  toDomain(row: RecordingSummaryRow): RecordingSummary {
    return new RecordingSummary({
      recordingId: row.recordingId,
      runId: row.runId,
      status: row.status,
      triggeredByUserId: row.triggeredByUserId,
      content: row.content,
      modelId: row.modelId,
      modelName: row.modelName,
      generatedAt: row.generatedAt,
      failure: row.failure,
    });
  }
}
