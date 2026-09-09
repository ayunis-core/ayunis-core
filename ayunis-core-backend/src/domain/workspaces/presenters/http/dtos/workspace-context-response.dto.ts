import { ApiProperty } from '@nestjs/swagger';

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

export class WorkspaceContextResponseDto {
  @ApiProperty({ type: String, nullable: true })
  instruction: string | null;

  @ApiProperty({ type: [WorkspaceSkillResponseDto] })
  skills: WorkspaceSkillResponseDto[];

  @ApiProperty({ type: [WorkspaceKnowledgeBaseResponseDto] })
  knowledgeBases: WorkspaceKnowledgeBaseResponseDto[];
}
