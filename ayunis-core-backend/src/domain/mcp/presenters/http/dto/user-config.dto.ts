import { ApiProperty } from '@nestjs/swagger';
import { IsObject } from 'class-validator';
import { IsStringRecord } from 'src/common/validators/is-string-record.validator';

/**
 * DTO for setting per-user configuration on a marketplace MCP integration.
 */
export class SetUserConfigDto {
  @ApiProperty({
    description:
      'User-level configuration values (key-value pairs matching config schema userFields)',
    example: { personalToken: 'my-personal-access-token' },
    type: 'object',
    additionalProperties: { type: 'string' },
  })
  @IsObject()
  @IsStringRecord({ message: 'all values in configValues must be strings' })
  configValues: Record<string, string>;
}

/**
 * Response DTO for user configuration.
 * Secret values are masked — only keys are visible.
 */
export class UserConfigResponseDto {
  @ApiProperty({
    description: 'Whether the user has configured values for this integration',
    example: true,
  })
  hasConfig: boolean;

  @ApiProperty({
    description:
      'Configuration values with secret values masked (keys present, values replaced with "***")',
    example: { personalToken: '***' },
    type: 'object',
    additionalProperties: { type: 'string' },
  })
  configValues: Record<string, string>;
}
