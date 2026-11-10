import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class LogoutRequestDto {
  @ApiPropertyOptional({
    description:
      'Refresh token of a token client. Read only when no refresh cookie is ' +
      'present; no cookies are written on that path.',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  refreshToken?: string;
}
