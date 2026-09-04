import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class SetKnowledgeBaseActivationRequestDto {
  @ApiProperty({
    description:
      'Whether the knowledge base is available to the current user during chats',
    example: true,
  })
  @IsBoolean()
  isActive: boolean;
}
