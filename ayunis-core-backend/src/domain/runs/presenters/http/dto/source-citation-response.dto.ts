import { ApiProperty } from '@nestjs/swagger';

export enum SourceCitationRecordingPosition {
  TRANSCRIPT = 'transcript',
  SUMMARY = 'summary',
}

export class SourceCitationChunkResponseDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ description: 'Exact extracted chunk text shown to the model' })
  content: string;

  @ApiProperty({ type: Number, nullable: true })
  startLine: number | null;

  @ApiProperty({ type: Number, nullable: true })
  endLine: number | null;
}

export class SourceCitationSourceResponseDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty({ type: String, nullable: true })
  url: string | null;
}

export class SourceCitationRecordingResponseDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty({ type: String, format: 'date-time' })
  uploadedAt: Date;

  @ApiProperty({
    enum: SourceCitationRecordingPosition,
    enumName: 'SourceCitationRecordingPosition',
    description: 'Whether the chunk is part of the transcript or the summary',
  })
  position: SourceCitationRecordingPosition;

  @ApiProperty({
    type: Number,
    nullable: true,
    description: 'Start of the transcript chunk, in seconds',
  })
  start: number | null;

  @ApiProperty({
    type: Number,
    nullable: true,
    description: 'End of the transcript chunk, in seconds',
  })
  end: number | null;

  @ApiProperty({
    type: [Number],
    description:
      'Speakers of the transcript chunk, numbered as in the transcript',
  })
  speakerNumbers: number[];
}

export class SourceCitationResponseDto {
  @ApiProperty({ type: SourceCitationChunkResponseDto })
  chunk: SourceCitationChunkResponseDto;

  @ApiProperty({ type: SourceCitationSourceResponseDto })
  source: SourceCitationSourceResponseDto;

  @ApiProperty({
    type: SourceCitationRecordingResponseDto,
    nullable: true,
    description: 'The recording whose transcript or summary is cited',
  })
  recording: SourceCitationRecordingResponseDto | null;
}
