import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { UUID } from 'crypto';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import {
  LinkOwnerDto,
  LinkPersonDto,
} from 'src/domain/workspaces/presenters/http/dtos/workspace-link.dto';

export class LinkSkillsDto {
  @ApiProperty({ type: [String], format: 'uuid', minItems: 1 })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @IsUUID('all', { each: true })
  skillIds: UUID[];
}

export class SkillLinkSearchQueryDto {
  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  search?: string;
}

export class SkillLinkSummaryDto {
  @ApiProperty({ type: 'string', format: 'uuid' })
  id: UUID;

  @ApiProperty()
  name: string;

  @ApiProperty()
  shortDescription: string;

  @ApiProperty({ type: LinkOwnerDto })
  owner: LinkOwnerDto;
}

export class LinkedSkillResponseDto {
  @ApiProperty({ type: SkillLinkSummaryDto })
  skill: SkillLinkSummaryDto;

  @ApiProperty({
    type: LinkPersonDto,
    nullable: true,
    description: 'Null when the person who linked it no longer exists',
  })
  linkedBy: LinkPersonDto | null;

  @ApiProperty({ type: 'string', format: 'date-time' })
  linkedAt: Date;
}

export class LinkedSkillListResponseDto {
  @ApiProperty({ type: [LinkedSkillResponseDto] })
  data: LinkedSkillResponseDto[];
}

export class LinkableSkillsResponseDto {
  @ApiProperty({ type: [SkillLinkSummaryDto] })
  own: SkillLinkSummaryDto[];

  @ApiProperty({ type: [SkillLinkSummaryDto] })
  team: SkillLinkSummaryDto[];

  @ApiProperty({ type: [SkillLinkSummaryDto] })
  org: SkillLinkSummaryDto[];
}
