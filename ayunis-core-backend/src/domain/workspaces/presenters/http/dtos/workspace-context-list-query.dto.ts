import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';
import {
  WORKSPACE_CONTEXT_DEFAULT_LIST_LIMIT,
  WORKSPACE_CONTEXT_MAX_LIST_LIMIT,
} from 'src/domain/workspaces/domain/workspaces.constants';

export class WorkspaceContextListQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  limit?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  offset?: number;

  toQuery() {
    return {
      search: this.search,
      limit: Math.min(
        this.limit ?? WORKSPACE_CONTEXT_DEFAULT_LIST_LIMIT,
        WORKSPACE_CONTEXT_MAX_LIST_LIMIT,
      ),
      offset: this.offset ?? 0,
    };
  }
}
