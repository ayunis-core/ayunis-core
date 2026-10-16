import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { UUID } from 'crypto';
import { PaginationDto } from 'src/common/pagination/pagination.dto';
import { SourceStatus } from 'src/domain/sources/domain/source-status.enum';
import {
  OwnerDescriptionDto,
  ResourceViewerDto,
} from 'src/domain/ownership/presenters/http/dto/ownership.dto';

export class SkillResponseDto {
  @ApiProperty({ type: 'string', format: 'uuid' })
  id: UUID;

  @ApiProperty({ enum: ['personal', 'workspace', 'team', 'org'] })
  ownerType: 'personal' | 'workspace' | 'team' | 'org';

  @ApiPropertyOptional({ type: 'string', format: 'uuid' })
  userId?: UUID;

  @ApiPropertyOptional({ type: 'string', format: 'uuid' })
  workspaceId?: UUID;

  @ApiPropertyOptional({ type: 'string', format: 'uuid' })
  teamId?: UUID;

  @ApiPropertyOptional({
    type: ResourceViewerDto,
    description: 'What the caller may do; omitted for workspace skills',
  })
  viewer?: ResourceViewerDto;

  @ApiPropertyOptional({
    type: OwnerDescriptionDto,
    description: 'Audience and editors of a team or organisation skill',
  })
  ownerDescription?: OwnerDescriptionDto;

  @ApiProperty()
  name: string;

  @ApiProperty()
  shortDescription: string;

  @ApiProperty()
  instructions: string;

  @ApiProperty({ type: 'string', nullable: true })
  marketplaceIdentifier: string | null;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty({ type: 'string', format: 'date-time' })
  createdAt: Date;

  @ApiProperty({ type: 'string', format: 'date-time' })
  updatedAt: Date;

  @ApiProperty()
  isPinned: boolean;

  @ApiProperty({
    description:
      'Organisation skill that is always active for everyone; isActive is then always true',
  })
  isMandatory: boolean;
}

export class SkillListResponseDto {
  @ApiProperty({ type: [SkillResponseDto] })
  data: SkillResponseDto[];

  @ApiProperty({ type: PaginationDto })
  pagination: PaginationDto;
}

export class SkillSourceResponseDto {
  @ApiProperty({ type: 'string', format: 'uuid' })
  id: UUID;

  @ApiProperty()
  name: string;

  @ApiProperty()
  type: string;

  @ApiProperty({ enum: SourceStatus })
  status: SourceStatus;

  @ApiPropertyOptional()
  processingError?: string;

  @ApiProperty({ type: 'string', format: 'date-time' })
  createdAt: string;
}
