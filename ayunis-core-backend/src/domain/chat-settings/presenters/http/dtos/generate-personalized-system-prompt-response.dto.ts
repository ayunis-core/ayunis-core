import { ApiProperty } from '@nestjs/swagger';

export class GeneratePersonalizedSystemPromptResponseDto {
  @ApiProperty({
    description: 'The generated personalized system prompt',
    example:
      'Hallo Maria! Ich kommuniziere locker und kurz mit dir. Ich helfe dir bei allen Fragen rund um deine Arbeit im Sozialamt.',
  })
  systemPrompt: string;

  @ApiProperty({
    description: 'A personalized welcome message for the user',
    example:
      'Willkommen, Maria! Schön, dass du da bist. Wie kann ich dir heute helfen?',
  })
  welcomeMessage: string;
}
