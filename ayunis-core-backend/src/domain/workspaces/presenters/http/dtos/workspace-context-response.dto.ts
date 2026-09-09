import { ApiProperty } from '@nestjs/swagger';
import { PaginationDto } from 'src/common/pagination/pagination.dto';

export class WorkspaceSkillResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  shortDescription: string;

  @ApiProperty()
  instructions: string;

  @ApiProperty({ type: [String] })
  knowledgeBaseIds: string[];

  @ApiProperty()
  workspaceId: string;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty()
  isPinned: boolean;
}

export class WorkspaceSkillCandidateResponseDto extends WorkspaceSkillResponseDto {
  @ApiProperty()
  isAttached: boolean;
}

export class WorkspaceKnowledgeBaseResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty({ type: String, nullable: true })
  description: string | null;

  @ApiProperty()
  documentCount: number;

  @ApiProperty()
  isActive: boolean;
}

export class WorkspaceKnowledgeBaseCandidateResponseDto extends WorkspaceKnowledgeBaseResponseDto {
  @ApiProperty()
  isAttached: boolean;
}

export class WorkspaceContextResponseDto {
  @ApiProperty({ type: String, nullable: true })
  instruction: string | null;

  @ApiProperty({ type: [WorkspaceSkillResponseDto] })
  skills: WorkspaceSkillResponseDto[];

  @ApiProperty({ type: [WorkspaceKnowledgeBaseResponseDto] })
  knowledgeBases: WorkspaceKnowledgeBaseResponseDto[];
}

export class WorkspaceSkillListResponseDto {
  @ApiProperty({ type: [WorkspaceSkillResponseDto] })
  data: WorkspaceSkillResponseDto[];

  @ApiProperty({ type: PaginationDto })
  pagination: PaginationDto;
}

export class WorkspaceSkillCandidateListResponseDto {
  @ApiProperty({ type: [WorkspaceSkillCandidateResponseDto] })
  data: WorkspaceSkillCandidateResponseDto[];

  @ApiProperty({ type: PaginationDto })
  pagination: PaginationDto;
}

export class WorkspaceKnowledgeBaseCandidateListResponseDto {
  @ApiProperty({ type: [WorkspaceKnowledgeBaseCandidateResponseDto] })
  data: WorkspaceKnowledgeBaseCandidateResponseDto[];

  @ApiProperty({ type: PaginationDto })
  pagination: PaginationDto;
}
