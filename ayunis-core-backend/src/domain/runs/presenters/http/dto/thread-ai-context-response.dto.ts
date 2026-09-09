import { ApiProperty } from '@nestjs/swagger';
import type { UUID } from 'crypto';

export class ThreadAiContextSkillResponseDto {
  @ApiProperty({ type: 'string', format: 'uuid' })
  id: UUID;

  @ApiProperty()
  name: string;

  @ApiProperty()
  shortDescription: string;

  @ApiProperty({ type: 'string', format: 'uuid', nullable: true })
  workspaceId: UUID | null;
}

export class ThreadAiContextKnowledgeBaseResponseDto {
  @ApiProperty({ type: 'string', format: 'uuid' })
  id: UUID;

  @ApiProperty()
  name: string;

  @ApiProperty()
  documentCount: number;

  @ApiProperty({ type: 'string', format: 'uuid', nullable: true })
  workspaceId: UUID | null;
}

export class ThreadAiContextResponseDto {
  @ApiProperty({ type: [ThreadAiContextSkillResponseDto] })
  skills: ThreadAiContextSkillResponseDto[];

  @ApiProperty({ type: [ThreadAiContextKnowledgeBaseResponseDto] })
  knowledgeBases: ThreadAiContextKnowledgeBaseResponseDto[];
}
