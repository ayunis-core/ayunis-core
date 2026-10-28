import { ApiProperty } from '@nestjs/swagger';
import type { UUID } from 'crypto';
import { PaginationDto } from 'src/common/pagination/pagination.dto';
import { CertificateValidityStatus } from 'src/iam/academy-access/domain/value-objects/certificate-validity-status.enum';

export class OrgCertificateStatusResponseDto {
  @ApiProperty({ type: 'string', format: 'uuid' })
  userId: UUID;

  @ApiProperty({ type: 'string', example: 'Anna Admin' })
  name: string;

  @ApiProperty({ type: 'string', example: 'anna@example.com' })
  email: string;

  @ApiProperty({
    type: 'string',
    format: 'date-time',
    nullable: true,
    description:
      'When the member last completed the academy, or null if they never have',
  })
  completedAt: Date | null;

  @ApiProperty({
    type: 'string',
    format: 'date-time',
    nullable: true,
    description:
      'When the certificate stops being valid. Only populated when the org requires annual renewal.',
  })
  expiresAt: Date | null;

  @ApiProperty({
    enum: CertificateValidityStatus,
    enumName: 'CertificateValidityStatus',
  })
  status: CertificateValidityStatus;
}

export class PaginatedOrgCertificateStatusesResponseDto {
  @ApiProperty({ type: [OrgCertificateStatusResponseDto] })
  data: OrgCertificateStatusResponseDto[];

  @ApiProperty({ type: PaginationDto })
  pagination: PaginationDto;
}
