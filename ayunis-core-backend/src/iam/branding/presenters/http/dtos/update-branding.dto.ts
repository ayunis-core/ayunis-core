import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

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
