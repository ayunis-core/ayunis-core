import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { KnowledgeBasesConstants } from 'src/domain/knowledge-bases/domain/knowledge-bases.constants';
import { KnowledgeBaseOwnerDto } from 'src/domain/knowledge-bases/presenters/http/dto/knowledge-base-owner.dto';

export class ListKnowledgeBasesQueryDto extends KnowledgeBaseOwnerDto {
  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    type: Number,
    minimum: 1,
    maximum: KnowledgeBasesConstants.MAX_LIST_LIMIT,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(KnowledgeBasesConstants.MAX_LIST_LIMIT)
  @Type(() => Number)
  limit?: number;

  @ApiPropertyOptional({ type: Number, minimum: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  offset?: number;
}
