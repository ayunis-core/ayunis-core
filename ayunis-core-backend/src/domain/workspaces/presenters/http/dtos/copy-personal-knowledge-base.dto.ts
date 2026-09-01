import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';
import type { UUID } from 'crypto';

export class CopyPersonalKnowledgeBaseDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  knowledgeBaseId: UUID;
}
