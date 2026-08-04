import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsDefined,
  IsIn,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsUrl,
  Length,
  Matches,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsStringRecord } from 'src/common/validators/is-string-record.validator';

export class CustomMcpConfigFieldDto {
  @ApiProperty({ example: 'personalToken' })
  @IsString()
  @Matches(/^[A-Za-z][A-Za-z0-9_-]{0,99}$/)
  key: string;

  @ApiProperty({ example: 'Personal access token' })
  @IsString()
  @IsNotEmpty()
  @Length(1, 255)
  label: string;

  @ApiProperty({ enum: ['text', 'url', 'secret'], example: 'secret' })
  @IsIn(['text', 'url', 'secret'])
  type: 'text' | 'url' | 'secret';

  @ApiProperty({ example: 'Authorization' })
  @IsString()
  @Matches(/^[!#$%&'*+.^_`|~0-9A-Za-z-]+$/)
  @MaxLength(255)
  headerName: string;

  @ApiPropertyOptional({ example: 'Bearer ' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  prefix?: string;

  @ApiProperty({ example: true })
  @IsBoolean()
  required: boolean;

  @ApiPropertyOptional({ example: 'Create a token in your profile.' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  help?: string;
}

export class CustomMcpOAuthConfigDto {
  @ApiProperty({ enum: ['automatic', 'static'], example: 'automatic' })
  @IsIn(['automatic', 'static'])
  clientRegistration: 'automatic' | 'static';

  @ApiPropertyOptional({ type: [String], example: ['documents:read'] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  scopes?: string[];
}

export class CustomMcpConfigSchemaDto {
  @ApiProperty({ enum: ['CUSTOM', 'OAUTH'], example: 'CUSTOM' })
  @IsOptional()
  @IsIn(['CUSTOM', 'OAUTH'])
  authType?: 'CUSTOM' | 'OAUTH';

  @ApiProperty({ type: [CustomMcpConfigFieldDto] })
  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => CustomMcpConfigFieldDto)
  orgFields: CustomMcpConfigFieldDto[];

  @ApiProperty({ type: [CustomMcpConfigFieldDto] })
  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => CustomMcpConfigFieldDto)
  userFields: CustomMcpConfigFieldDto[];

  @ApiPropertyOptional({ type: CustomMcpOAuthConfigDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => CustomMcpOAuthConfigDto)
  oauth?: CustomMcpOAuthConfigDto;
}

export class McpOAuthClientDto {
  @ApiProperty({ example: 'ayunis-core-client' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(2048)
  clientId: string;

  @ApiPropertyOptional({ example: 'client-secret' })
  @IsOptional()
  @IsString()
  @MaxLength(4096)
  clientSecret?: string;
}

export class CreateCustomIntegrationDto {
  @ApiProperty({ example: 'My Custom MCP Server' })
  @IsString()
  @IsNotEmpty()
  @Length(1, 255)
  name: string;

  @ApiProperty({ example: 'https://my-mcp-server.example.com/mcp' })
  @IsUrl({
    protocols: ['http', 'https'],
    require_protocol: true,
    require_tld: false,
  })
  @IsNotEmpty()
  serverUrl: string;

  @ApiProperty({ type: CustomMcpConfigSchemaDto })
  @IsDefined()
  @ValidateNested()
  @Type(() => CustomMcpConfigSchemaDto)
  configSchema: CustomMcpConfigSchemaDto;

  @ApiPropertyOptional({ type: McpOAuthClientDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => McpOAuthClientDto)
  oauthClient?: McpOAuthClientDto;

  @ApiProperty({
    type: 'object',
    additionalProperties: { type: 'string' },
    example: { tenantId: 'council-42' },
  })
  @IsObject()
  @IsStringRecord({ message: 'all values in orgConfigValues must be strings' })
  orgConfigValues: Record<string, string>;

  @ApiPropertyOptional({ example: true, default: true })
  @IsOptional()
  @IsBoolean()
  returnsPii?: boolean;
}
