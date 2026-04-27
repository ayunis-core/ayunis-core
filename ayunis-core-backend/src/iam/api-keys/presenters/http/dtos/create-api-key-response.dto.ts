import { ApiProperty } from '@nestjs/swagger';
import { ApiKeyResponseDto } from './api-key-response.dto';

export class CreateApiKeyResponseDto extends ApiKeyResponseDto {
  @ApiProperty({
    description:
      'The full plaintext API key. This is the only response that will ever contain it — store it securely and immediately. It cannot be retrieved later.',
    example: 'ayk_live_abc123def456ghi789...',
  })
  secret: string;
}
