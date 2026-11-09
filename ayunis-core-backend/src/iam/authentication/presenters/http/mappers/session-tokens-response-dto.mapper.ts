import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { getMillisecondsFromJwtExpiry } from 'src/common/util/jwt.util';
import type { AuthTokens } from 'src/iam/authentication/domain/auth-tokens.entity';
import type { SessionTokensResponseDto } from 'src/iam/authentication/presenters/http/dtos/session-tokens.dto';

@Injectable()
export class SessionTokensResponseDtoMapper {
  constructor(private readonly configService: ConfigService) {}

  toDto(tokens: AuthTokens): SessionTokensResponseDto {
    const expiresInMs = getMillisecondsFromJwtExpiry(
      this.configService.get<string>('auth.jwt.expiresIn', '1h'),
    );
    return {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresIn: Math.floor(expiresInMs / 1000),
    };
  }
}
