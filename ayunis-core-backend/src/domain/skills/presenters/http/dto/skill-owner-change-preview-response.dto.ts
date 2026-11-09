import { ApiProperty } from '@nestjs/swagger';

export class SkillOwnerChangePreviewResponseDto {
  @ApiProperty({
    description:
      'Knowledge bases whose link to the skill is removed because they have a different owner',
  })
  unlinkedKnowledgeBaseCount: number;
}
