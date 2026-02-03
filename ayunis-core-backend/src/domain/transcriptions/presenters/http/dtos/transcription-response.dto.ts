import { ApiProperty } from '@nestjs/swagger';

export class TranscriptionResponseDto {
  @ApiProperty({
    description: 'The transcribed text from the audio file',
    example: 'Hello, this is a test transcription.',
  })
  text: string;

  constructor(text: string) {
    this.text = text;
  }
}
