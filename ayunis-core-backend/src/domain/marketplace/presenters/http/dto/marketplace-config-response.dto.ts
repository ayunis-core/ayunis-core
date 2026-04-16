import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class MarketplaceConfigResponseDto {
  @ApiProperty({
    description: 'Whether the marketplace feature is enabled',
    example: true,
  })
  enabled: boolean;

  @ApiPropertyOptional({
    description:
      'URL of the marketplace service, exposed so the frontend can link to it. Null when the feature is disabled.',
    type: 'string',
    nullable: true,
    example: 'https://marketplace.example.com',
  })
  url: string | null;
}
