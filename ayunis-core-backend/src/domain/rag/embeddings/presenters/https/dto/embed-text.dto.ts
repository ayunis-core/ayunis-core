import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class EmbedTextDto {
  @ApiProperty({
    description: 'The text to embed',
    type: String,
    example: 'This is a sample text that needs to be embedded into a vector.',
  })
  @IsNotEmpty()
  @IsString({ each: true })
  texts: string[];
}
