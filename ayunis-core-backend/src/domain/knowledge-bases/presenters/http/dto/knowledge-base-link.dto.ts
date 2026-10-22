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

export class LinkKnowledgeBasesDto {
  @ApiProperty({ type: [String], format: 'uuid', minItems: 1 })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @IsUUID('all', { each: true })
  knowledgeBaseIds: UUID[];
}

export class KnowledgeBaseLinkSearchQueryDto {
  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  search?: string;
}

export class KnowledgeBaseLinkSummaryDto {
  @ApiProperty({ type: 'string', format: 'uuid' })
  id: UUID;

  @ApiProperty()
  name: string;

  @ApiProperty()
  description: string;

  @ApiProperty({ type: LinkOwnerDto })
  owner: LinkOwnerDto;
}

export class LinkedKnowledgeBaseResponseDto {
  @ApiProperty({ type: KnowledgeBaseLinkSummaryDto })
  knowledgeBase: KnowledgeBaseLinkSummaryDto;

  @ApiProperty({
    type: LinkPersonDto,
    nullable: true,
    description: 'Null when the person who linked it no longer exists',
  })
  linkedBy: LinkPersonDto | null;

  @ApiProperty({ type: 'string', format: 'date-time' })
  linkedAt: Date;
}

export class LinkedKnowledgeBaseListResponseDto {
  @ApiProperty({ type: [LinkedKnowledgeBaseResponseDto] })
  data: LinkedKnowledgeBaseResponseDto[];
}

export class LinkableKnowledgeBasesResponseDto {
  @ApiProperty({ type: [KnowledgeBaseLinkSummaryDto] })
  own: KnowledgeBaseLinkSummaryDto[];

  @ApiProperty({ type: [KnowledgeBaseLinkSummaryDto] })
  team: KnowledgeBaseLinkSummaryDto[];

  @ApiProperty({ type: [KnowledgeBaseLinkSummaryDto] })
  org: KnowledgeBaseLinkSummaryDto[];
}
