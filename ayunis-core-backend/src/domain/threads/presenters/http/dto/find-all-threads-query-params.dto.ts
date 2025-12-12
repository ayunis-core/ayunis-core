import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID } from 'class-validator';

export class FindAllThreadsQueryParamsDto {
  @ApiPropertyOptional({ description: 'Search threads by title' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Filter threads by agent ID' })
  @IsOptional()
  @IsUUID()
  agentId?: string;
}
