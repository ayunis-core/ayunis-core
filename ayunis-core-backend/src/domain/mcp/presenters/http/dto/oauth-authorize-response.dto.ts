import { ApiProperty } from '@nestjs/swagger';

/**
 * Response DTO for OAuth authorization initiation.
 * Contains the URL the client should redirect to.
 */
export class OAuthAuthorizeResponseDto {
  @ApiProperty({
    description: 'Authorization URL to redirect the user to',
    example:
      'https://auth.example.com/authorize?response_type=code&client_id=abc&...',
  })
  authorizationUrl: string;
}
