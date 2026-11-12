import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { UUID } from 'crypto';
import { RecordingStatus } from 'src/domain/recordings/domain/recording-status.enum';
import { SourceProcessingErrorCode } from 'src/domain/sources/domain/source-processing-error-code.enum';
import { RecordingOwnerType } from './recording-owner.dto';

export class RecordingResponseDto {
  @ApiProperty({ type: 'string', format: 'uuid' })
  id: UUID;

  @ApiProperty({ example: 'Stadtratssitzung 12. November' })
  name: string;

  @ApiProperty({ enum: RecordingOwnerType })
  ownerType: RecordingOwnerType;

  @ApiProperty({
    type: 'string',
    format: 'uuid',
    required: false,
    description: 'The owning workspace of workspace recordings',
  })
  workspaceId?: UUID;

  @ApiProperty({
    type: 'string',
    format: 'uuid',
    required: false,
    description: 'The owning team of team recordings',
  })
  teamId?: UUID;

  @ApiProperty({
    type: 'string',
    nullable: true,
    description:
      'The name of the user who created the recording; null once they are deleted',
  })
  creatorName: string | null;

  @ApiProperty({
    enum: RecordingStatus,
    enumName: 'RecordingStatus',
    description:
      'uploading until the audio is stored, then transcribing, transcribed or failed',
  })
  status: RecordingStatus;

  @ApiPropertyOptional({
    enum: SourceProcessingErrorCode,
    enumName: 'SourceProcessingErrorCode',
    description: 'Why the transcription failed; only when the status is failed',
  })
  failureCode?: SourceProcessingErrorCode;

  @ApiProperty({ type: 'string', format: 'date-time' })
  createdAt: Date;

  @ApiProperty({ type: 'string', format: 'date-time' })
  updatedAt: Date;
}

export class RecordingListResponseDto {
  @ApiProperty({ type: [RecordingResponseDto] })
  data: RecordingResponseDto[];
}
