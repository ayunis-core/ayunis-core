import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class UpsertUserSystemPromptDto {
  @ApiProperty({
    description: 'The custom system prompt for the user',
    example:
      'Always respond in bullet points. I work in the finance department.',
    maxLength: 10000,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(10000)
  systemPrompt: string;
}
