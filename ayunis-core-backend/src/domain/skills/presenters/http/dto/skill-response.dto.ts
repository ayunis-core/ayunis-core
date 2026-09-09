import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { UUID } from 'crypto';
import { PaginationDto } from 'src/common/pagination/pagination.dto';
import { SourceStatus } from 'src/domain/sources/domain/source-status.enum';

export class SkillResponseDto {
  @ApiProperty({ type: 'string', format: 'uuid' })
  id: UUID;

  @ApiProperty({ enum: ['personal', 'workspace'] })
  ownerType: 'personal' | 'workspace';

  @ApiPropertyOptional({ type: 'string', format: 'uuid' })
  userId?: UUID;

  @ApiPropertyOptional({ type: 'string', format: 'uuid' })
  workspaceId?: UUID;

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
  isShared: boolean;

  @ApiProperty()
  isPinned: boolean;

  @ApiProperty({ type: 'string', nullable: true })
  creatorName: string | null;
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
