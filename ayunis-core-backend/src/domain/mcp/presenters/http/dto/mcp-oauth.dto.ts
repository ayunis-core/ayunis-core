import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CompleteMcpOAuthDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(2048)
  state: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(8192)
  code?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2048)
  iss?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  error?: string;
}

export class McpOAuthAuthorizationUrlDto {
  @ApiProperty({ format: 'uri' })
  authorizationUrl: string;
}

export class McpOAuthCompleteResponseDto {
  @ApiProperty({ format: 'uuid' })
  integrationId: string;
}

export class McpOAuthClientMetadataDto {
  @ApiProperty({ format: 'uri' })
  client_id: string;

  @ApiProperty()
  client_name: string;

  @ApiProperty({ format: 'uri' })
  client_uri: string;

  @ApiProperty({ type: [String], format: 'uri' })
  redirect_uris: string[];

  @ApiProperty({ enum: ['authorization_code', 'refresh_token'], isArray: true })
  grant_types: Array<'authorization_code' | 'refresh_token'>;

  @ApiProperty({ enum: ['code'], isArray: true })
  response_types: ['code'];

  @ApiProperty({ enum: ['none'] })
  token_endpoint_auth_method: 'none';

  @ApiProperty({ enum: ['web'] })
  application_type: 'web';
}
