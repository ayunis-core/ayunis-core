import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, Length } from 'class-validator';

export class UpdatePromptDto {
  @ApiProperty({
    description: 'The title of the prompt',
    example: 'Updated Project Planning Assistant',
    minLength: 1,
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
  @Length(1, 255)
  title: string;

  @ApiProperty({
    description: 'The content of the prompt',
    example:
      'You are an expert project planning assistant. Provide comprehensive guidance for project management, including risk assessment and timeline optimization.',
  })
  @IsString()
  @IsNotEmpty()
  content: string;
}
