import { ApiPropertyOptional } from '@nestjs/swagger';

// Explicit fields so Swagger shows concrete keys instead of additionalProp*
export class ProviderValuesDto {
  @ApiPropertyOptional({ description: 'Credits for OpenAI' })
  openai?: number;

  @ApiPropertyOptional({ description: 'Credits for Anthropic' })
  anthropic?: number;

  @ApiPropertyOptional({ description: 'Credits for Mistral' })
  mistral?: number;

  @ApiPropertyOptional({ description: 'Credits for Ollama' })
  ollama?: number;

  @ApiPropertyOptional({ description: 'Credits for Synaforce' })
  synaforce?: number;

  @ApiPropertyOptional({ description: 'Credits for Ayunis (internal)' })
  ayunis?: number;
}
