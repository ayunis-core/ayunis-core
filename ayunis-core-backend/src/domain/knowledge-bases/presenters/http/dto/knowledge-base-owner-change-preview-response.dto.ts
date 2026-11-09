import { ApiProperty } from '@nestjs/swagger';

export class KnowledgeBaseOwnerChangePreviewResponseDto {
  @ApiProperty({
    description:
      'Skills whose link to the knowledge base is removed because they have a different owner',
  })
  unlinkedSkillCount: number;
}
