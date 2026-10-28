import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { SkillsConstants } from 'src/domain/skills/domain/skills.constants';
import { SkillOwnerDto } from './skill-owner.dto';

export class ListSkillsQueryDto extends SkillOwnerDto {
  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    type: Number,
    minimum: 1,
    maximum: SkillsConstants.MAX_LIST_LIMIT,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(SkillsConstants.MAX_LIST_LIMIT)
  @Type(() => Number)
  limit?: number;

  @ApiPropertyOptional({ type: Number, minimum: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  offset?: number;
}
