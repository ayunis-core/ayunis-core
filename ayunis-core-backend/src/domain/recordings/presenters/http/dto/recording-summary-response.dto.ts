import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RecordingSummaryFailure } from 'src/domain/recordings/domain/recording-summary-failure.enum';

export enum RecordingSummaryState {
  SUMMARIZING = 'summarizing',
  READY = 'ready',
  FAILED = 'failed',
}

/** Where a recording's summary is; its text is read separately. */
export class RecordingSummaryStateDto {
  @ApiProperty({
    enum: RecordingSummaryState,
    enumName: 'RecordingSummaryState',
  })
  status: RecordingSummaryState;

  @ApiPropertyOptional({
    enum: RecordingSummaryFailure,
    enumName: 'RecordingSummaryFailure',
    description: 'Why the summary failed; only when the status is failed',
  })
  failureCode?: RecordingSummaryFailure;

  @ApiPropertyOptional({
    description:
      'The model that generated the summary; only when the status is ready',
    example: 'Mistral Large (Mistral)',
  })
  modelName?: string;

  @ApiPropertyOptional({
    type: 'string',
    format: 'date-time',
    description:
      'When the summary was generated; only when the status is ready',
  })
  generatedAt?: Date;
}

export class RecordingSummaryResponseDto {
  @ApiProperty({
    description: 'The summary in Markdown',
    example: '## Thema\n\nHaushalt 2027',
  })
  content: string;
}
