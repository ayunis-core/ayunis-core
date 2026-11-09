import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import {
  SESSION_CLIENTS,
  type SessionClient,
} from 'src/iam/sessions/domain/value-objects/session-client';

export class SessionHandoffRequestDto {
  @ApiProperty({
    description: 'Token client that takes over the session',
    enum: SESSION_CLIENTS,
    example: 'outlook',
  })
  @IsIn(SESSION_CLIENTS)
  client: SessionClient;
}

export class RefreshTokenRequestDto {
  @ApiPropertyOptional({
    description:
      'Refresh token of a token client. Read only when no refresh cookie is ' +
      'present; the new tokens are then returned in the body.',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  refreshToken?: string;
}

export class SessionTokensResponseDto {
  @ApiProperty({ description: 'Access JWT for the Authorization header' })
  accessToken: string;

  @ApiProperty({ description: 'Opaque refresh token, rotated on every use' })
  refreshToken: string;

  @ApiProperty({
    description: 'Access token lifetime in seconds',
    example: 3600,
  })
  expiresIn: number;
}
