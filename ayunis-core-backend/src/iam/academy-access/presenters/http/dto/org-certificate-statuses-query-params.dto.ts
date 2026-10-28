import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { CertificateValidityStatus } from 'src/iam/academy-access/domain/value-objects/certificate-validity-status.enum';

export class OrgCertificateStatusesQueryParamsDto {
  @ApiPropertyOptional({
    description: 'Search members by name or email',
    example: 'anna',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    enum: CertificateValidityStatus,
    enumName: 'CertificateValidityStatus',
    description: 'Only return members whose certificate is in this state',
  })
  @IsOptional()
  @IsEnum(CertificateValidityStatus)
  status?: CertificateValidityStatus;

  @ApiPropertyOptional({
    description: 'Maximum number of members to return',
    example: 25,
    default: 25,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  limit?: number;

  @ApiPropertyOptional({
    description: 'Number of members to skip',
    example: 0,
    default: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  offset?: number;
}
