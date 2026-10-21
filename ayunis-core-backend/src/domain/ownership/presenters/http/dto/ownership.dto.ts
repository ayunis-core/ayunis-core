import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { UUID } from 'crypto';

export class ResourceViewerDto {
  @ApiProperty({ description: 'The viewer is in the audience of the item' })
  canUse: boolean;

  @ApiProperty({ description: 'The viewer may change the item' })
  canEdit: boolean;

  @ApiProperty({ description: 'The viewer may delete the item' })
  canDelete: boolean;
}

export class OwnerEditorDto {
  @ApiProperty({ type: 'string', format: 'uuid' })
  userId: string;

  @ApiProperty()
  name: string;
}

export class OwnerDescriptionDto {
  @ApiProperty({ type: 'string', nullable: true })
  teamName: string | null;

  @ApiProperty({
    type: 'number',
    nullable: true,
    description: 'Team members or organisation users who can use the item',
  })
  audienceCount: number | null;

  @ApiProperty({
    type: [OwnerEditorDto],
    description: 'Team admins who may change items of the owning team',
  })
  teamEditors: OwnerEditorDto[];

  @ApiProperty({
    description:
      'A non-admin role holds the organisation right for this resource',
  })
  orgEditorsIncludeNonAdmins: boolean;

  @ApiProperty({
    type: OwnerEditorDto,
    nullable: true,
    description: 'Who handed the item over to its team or organisation',
  })
  submittedBy: OwnerEditorDto | null;
}

export enum OwnerOptionType {
  PERSONAL = 'personal',
  TEAM = 'team',
  ORG = 'org',
}

export class OwnerOptionDto {
  @ApiProperty({ enum: OwnerOptionType, enumName: 'OwnerOptionType' })
  type: OwnerOptionType;

  @ApiPropertyOptional({ type: 'string', format: 'uuid' })
  teamId?: UUID;

  @ApiPropertyOptional()
  teamName?: string;

  @ApiPropertyOptional()
  memberCount?: number;

  @ApiPropertyOptional({
    type: [OwnerEditorDto],
    description: 'Team admins who may change items of this team',
  })
  editors?: OwnerEditorDto[];
}

export class OwnerOptionsResponseDto {
  @ApiProperty({ type: [OwnerOptionDto] })
  options: OwnerOptionDto[];

  @ApiProperty()
  orgEditorsIncludeNonAdmins: boolean;
}
