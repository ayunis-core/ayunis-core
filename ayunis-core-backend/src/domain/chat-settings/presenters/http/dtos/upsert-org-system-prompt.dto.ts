import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class UpsertOrgSystemPromptDto {
  @ApiProperty({
    description: 'The organization-wide system prompt',
    example:
      'All responses must comply with municipal communication guidelines.',
    maxLength: 10000,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(10000)
  systemPrompt: string;
}
