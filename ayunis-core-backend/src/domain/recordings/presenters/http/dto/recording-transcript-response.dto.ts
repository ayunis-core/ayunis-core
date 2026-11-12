import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RecordingTranscriptTurnDto {
  @ApiPropertyOptional({
    description:
      'The speaker label the transcription provider assigned; absent when it named none',
    example: 'speaker_0',
  })
  speakerId?: string;

  @ApiPropertyOptional({
    description: 'Speakers numbered in order of first appearance',
    example: 1,
  })
  speakerNumber?: number;

  @ApiProperty({ description: 'Seconds from the start of the recording' })
  start: number;

  @ApiProperty({ description: 'Seconds from the start of the recording' })
  end: number;

  @ApiProperty({ example: 'Wir kommen zum Haushalt.' })
  text: string;
}

export class RecordingTranscriptResponseDto {
  @ApiProperty({
    type: [RecordingTranscriptTurnDto],
    description: 'Empty until the recording is transcribed',
  })
  turns: RecordingTranscriptTurnDto[];
}
