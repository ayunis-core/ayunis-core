import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MinLength } from 'class-validator';
import { UpdateBrandingDto } from './update-branding.dto';

export class SuperAdminUpdateBrandingDto extends UpdateBrandingDto {
  @ApiPropertyOptional({
    description:
      'Canonical organization name (internal — invoices, audit logs). Only super admins may rename an organization.',
    example: 'Stadt Musterstadt',
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;
}
