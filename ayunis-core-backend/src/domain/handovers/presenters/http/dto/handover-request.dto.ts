import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { UUID } from 'crypto';
import { HandoverResourceType } from 'src/domain/handovers/domain/handover-resource-type.enum';
import { HandoverStatus } from 'src/domain/handovers/domain/handover-status.enum';
import { OwnerEditorDto } from 'src/domain/ownership/presenters/http/dto/ownership.dto';

export enum HandoverTargetTypeDto {
  TEAM = 'team',
  ORG = 'org',
}

export class HandoverResourceDto {
  @ApiProperty({ type: 'string', format: 'uuid' })
  id: UUID;

  @ApiProperty()
  name: string;
}

export class HandoverTargetRefDto {
  @ApiProperty({ enum: HandoverTargetTypeDto, enumName: 'HandoverTargetType' })
  type: HandoverTargetTypeDto;

  @ApiPropertyOptional({ type: 'string', format: 'uuid' })
  teamId?: UUID;

  @ApiPropertyOptional()
  teamName?: string;
}

export class HandoverRequestDto {
  @ApiProperty({ type: 'string', format: 'uuid' })
  id: UUID;

  @ApiProperty({
    enum: HandoverResourceType,
    enumName: 'HandoverResourceType',
  })
  resourceType: HandoverResourceType;

  @ApiProperty({ type: HandoverResourceDto })
  resource: HandoverResourceDto;

  @ApiProperty({ type: HandoverTargetRefDto })
  target: HandoverTargetRefDto;

  @ApiProperty({ type: OwnerEditorDto })
  requestedBy: OwnerEditorDto;

  @ApiProperty({ type: 'string', format: 'date-time' })
  requestedAt: Date;

  @ApiProperty({ enum: HandoverStatus, enumName: 'HandoverStatus' })
  status: HandoverStatus;
}

export class PendingHandoverDto extends HandoverRequestDto {
  @ApiProperty()
  viewerIsRequester: boolean;

  @ApiProperty()
  viewerCanReview: boolean;

  @ApiProperty({
    type: [OwnerEditorDto],
    description: 'Team admins who may review a request to a team',
  })
  reviewers: OwnerEditorDto[];
}

export class PendingHandoverResponseDto {
  @ApiProperty({ type: PendingHandoverDto, nullable: true })
  pending: PendingHandoverDto | null;
}

export class HandoverTargetDto {
  @ApiProperty({ enum: HandoverTargetTypeDto, enumName: 'HandoverTargetType' })
  type: HandoverTargetTypeDto;

  @ApiPropertyOptional({ type: 'string', format: 'uuid' })
  teamId?: UUID;

  @ApiPropertyOptional()
  teamName?: string;

  @ApiProperty()
  isOwnTeam: boolean;

  @ApiProperty()
  memberCount: number;

  @ApiProperty({
    description: 'The caller may review this target, so no request is needed',
  })
  appliesImmediately: boolean;

  @ApiProperty({ type: [OwnerEditorDto] })
  reviewers: OwnerEditorDto[];
}

export class HandoverTargetsResponseDto {
  @ApiProperty({ type: [HandoverTargetDto] })
  targets: HandoverTargetDto[];

  @ApiProperty()
  orgEditorsIncludeNonAdmins: boolean;
}

export class HandoverSummaryDto {
  @ApiProperty()
  canReviewSkills: boolean;

  @ApiProperty()
  canReviewKnowledgeBases: boolean;

  @ApiProperty()
  openSkillRequests: number;

  @ApiProperty()
  openKnowledgeBaseRequests: number;
}
