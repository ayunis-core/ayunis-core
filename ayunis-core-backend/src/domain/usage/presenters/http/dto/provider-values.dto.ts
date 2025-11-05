import { ApiPropertyOptional } from '@nestjs/swagger';

// Explicit fields so Swagger shows concrete keys instead of additionalProp*
export class ProviderValuesDto {
  @ApiPropertyOptional({ description: 'Tokens for OpenAI' })
  openai?: number;

  @ApiPropertyOptional({ description: 'Tokens for Anthropic' })
  anthropic?: number;

  @ApiPropertyOptional({ description: 'Tokens for Mistral' })
  mistral?: number;

  @ApiPropertyOptional({ description: 'Tokens for Ollama' })
  ollama?: number;

  @ApiPropertyOptional({ description: 'Tokens for Synaforce' })
  synaforce?: number;

  @ApiPropertyOptional({ description: 'Tokens for Ayunis (internal)' })
  ayunis?: number;
}
