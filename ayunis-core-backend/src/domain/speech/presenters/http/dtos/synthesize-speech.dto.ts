import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class SynthesizeSpeechDto {
  @ApiProperty({
    description: 'The text to synthesize into speech',
    example: 'Ihr Antrag wurde genehmigt.',
    maxLength: 5000,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  input: string;
}
