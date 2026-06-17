import { ApiProperty } from '@nestjs/swagger';

export class OrgSystemPromptResponseDto {
  @ApiProperty({
    description: 'The organization-wide system prompt, or null if not set',
    example:
      'All responses must comply with municipal communication guidelines.',
    nullable: true,
    type: String,
  })
  systemPrompt: string | null;
}
