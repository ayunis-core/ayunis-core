import { ApiProperty } from '@nestjs/swagger';

export class ApiKeyUsageDto {
  @ApiProperty({ description: 'API key ID' })
  apiKeyId: string;

  @ApiProperty({ description: 'API key name' })
  name: string;

  @ApiProperty({
    type: String,
    format: 'date-time',
    description: 'Revocation timestamp, or null if the key was not revoked',
    nullable: true,
  })
  revokedAt: Date | null;

  @ApiProperty({
    type: String,
    format: 'date-time',
    description: 'Expiration date, or null if the key never expires',
    nullable: true,
  })
  expiresAt: Date | null;

  @ApiProperty({ description: 'Input tokens in the filtered period' })
  inputTokens: number;

  @ApiProperty({ description: 'Output tokens in the filtered period' })
  outputTokens: number;

  @ApiProperty({ description: 'Total tokens in the filtered period' })
  totalTokens: number;

  @ApiProperty({
    description:
      'Recorded inferences in the filtered period. Calls that produced no usage data are not counted.',
  })
  requests: number;

  @ApiProperty({
    type: Number,
    description:
      'Credits of all priced requests in the filtered period. Null when the key has requests but none of them could be priced.',
    nullable: true,
  })
  credits: number | null;

  @ApiProperty({
    description:
      'Requests without a credit value, for example because the model had no price configured',
  })
  unpricedRequests: number;

  @ApiProperty({
    type: String,
    format: 'date-time',
    description: 'Last recorded use in the filtered period (null if none)',
    nullable: true,
  })
  lastUsedAt: Date | null;
}

export class ApiKeyUsageResponseDto {
  @ApiProperty({
    description:
      'Usage per API key of the organization, including revoked and expired keys',
    type: [ApiKeyUsageDto],
  })
  data: ApiKeyUsageDto[];
}
