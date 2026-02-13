import { ApiProperty } from '@nestjs/swagger';

export class UserSystemPromptResponseDto {
  @ApiProperty({
    description: 'The custom system prompt for the user, or null if not set',
    example:
      'Always respond in bullet points. I work in the finance department.',
    nullable: true,
    type: String,
  })
  systemPrompt: string | null;
}
