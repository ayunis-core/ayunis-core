import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Matches } from 'class-validator';

export class UpdateBrandingDto {
  @ApiPropertyOptional({
    description:
      'Display name shown to end users in the sidebar. Send an empty string to clear and fall back to the platform default.',
    example: 'My Org',
  })
  @IsOptional()
  @IsString()
  displayName?: string;

  @ApiPropertyOptional({
    description: 'Set to "true" to remove the current favicon',
    example: 'true',
  })
  @IsOptional()
  @IsString()
  removeFavicon?: string;

  @ApiPropertyOptional({
    description: 'Primary brand color as a 6-digit hex string',
    example: '#3b82f6',
  })
  @IsOptional()
  @IsString()
  @Matches(/^#[0-9a-fA-F]{6}$/, {
    message: 'primaryColor must be a 6-digit hex like #3b82f6',
  })
  primaryColor?: string;

  @ApiPropertyOptional({
    description: 'Set to "true" to reset the primary color to default',
    example: 'true',
  })
  @IsOptional()
  @IsString()
  resetPrimaryColor?: string;

  // Declared for the OpenAPI schema only — the actual file is delivered by
  // the FileFieldsInterceptor via @UploadedFiles(), never through the body.
  @ApiPropertyOptional({
    type: 'string',
    format: 'binary',
    description: 'Favicon image file (PNG or JPEG, max 512 KB)',
  })
  @IsOptional()
  favicon?: Express.Multer.File;
}
