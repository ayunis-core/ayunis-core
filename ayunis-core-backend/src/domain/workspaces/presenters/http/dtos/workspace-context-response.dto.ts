import { ApiProperty } from '@nestjs/swagger';
import { SourceStatus } from 'src/domain/sources/domain/source-status.enum';
import {
  SourceType,
  TextType,
} from 'src/domain/sources/domain/source-type.enum';
import { SourceCreator } from 'src/domain/sources/domain/source-creator.enum';

export class WorkspaceSkillResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  shortDescription: string;
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
}

export class WorkspaceKnowledgeBaseCandidateResponseDto extends WorkspaceKnowledgeBaseResponseDto {
  @ApiProperty()
  isAttached: boolean;
}

export class WorkspaceDocumentResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty({ enum: SourceType })
  type: SourceType;

  @ApiProperty({ enum: SourceCreator })
  createdBy: SourceCreator;

  @ApiProperty({ enum: SourceStatus })
  status: SourceStatus;

  @ApiProperty({ type: String, nullable: true })
  processingError?: string | null;

  @ApiProperty({ enum: TextType, required: false })
  textType?: TextType;

  @ApiProperty({ required: false })
  url?: string;

  @ApiProperty()
  createdAt: string;

  @ApiProperty()
  updatedAt: string;
}

export class WorkspaceContextResponseDto {
  @ApiProperty({ type: String, nullable: true })
  instruction: string | null;

  @ApiProperty({ type: [WorkspaceSkillResponseDto] })
  skills: WorkspaceSkillResponseDto[];

  @ApiProperty({ type: [WorkspaceKnowledgeBaseResponseDto] })
  knowledgeBases: WorkspaceKnowledgeBaseResponseDto[];

  @ApiProperty({ type: [WorkspaceDocumentResponseDto] })
  documents: WorkspaceDocumentResponseDto[];
}
