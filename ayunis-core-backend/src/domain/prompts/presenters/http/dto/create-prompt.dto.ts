import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, Length } from 'class-validator';

export class CreatePromptDto {
  @ApiProperty({
    description: 'The title of the prompt',
    example: 'Project Planning Assistant',
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
      'You are a helpful assistant that helps with project planning. Please provide detailed step-by-step guidance for managing projects effectively.',
  })
  @IsString()
  @IsNotEmpty()
  content: string;
}
