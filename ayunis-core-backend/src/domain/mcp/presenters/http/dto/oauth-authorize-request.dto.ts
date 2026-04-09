import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class OAuthAuthorizeRequestDto {
  @ApiPropertyOptional({
    description:
      'Optional relative in-app path to return to after OAuth completes',
    example: '/settings/integrations?tab=mcp',
  })
  @IsOptional()
  @IsString()
  @MaxLength(2048)
  returnTo?: string;
}
