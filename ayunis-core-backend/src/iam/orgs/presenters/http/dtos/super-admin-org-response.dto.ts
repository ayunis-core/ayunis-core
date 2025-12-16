import { ApiProperty } from '@nestjs/swagger';
import { UUID } from 'crypto';
import { PaginationDto } from 'src/common/pagination';

export class SuperAdminOrgResponseDto {
  @ApiProperty({
    description: 'Organization unique identifier',
    format: 'uuid',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: UUID;

  @ApiProperty({
    description: 'Organization display name',
    example: 'Acme Corporation',
  })
  name: string;

  @ApiProperty({
    description: 'Date when the organization was created',
    example: '2024-01-15T10:30:00Z',
    type: Date,
  })
  createdAt: Date;
}

export class SuperAdminOrgListResponseDto {
  @ApiProperty({
    description: 'Collection of organizations accessible to super admins',
    type: [SuperAdminOrgResponseDto],
  })
  orgs: SuperAdminOrgResponseDto[];

  @ApiProperty({
    description: 'Pagination metadata',
    type: PaginationDto,
  })
  pagination: PaginationDto;
}
