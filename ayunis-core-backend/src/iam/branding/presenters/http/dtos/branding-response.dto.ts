import { ApiProperty } from '@nestjs/swagger';

export class BrandingResponseDto {
  @ApiProperty({ description: 'Organization name', example: 'Demo Org' })
  name: string;

  @ApiProperty({
    description:
      'Display name shown to end users in the sidebar. null means the platform default name is shown instead of the org name.',
    type: 'string',
    nullable: true,
    required: false,
    example: 'Demo Org',
  })
  displayName: string | null;

  @ApiProperty({
    description: 'Presigned URL for the organization favicon',
    type: 'string',
    nullable: true,
    required: false,
    example: null,
  })
  faviconUrl: string | null;
}
