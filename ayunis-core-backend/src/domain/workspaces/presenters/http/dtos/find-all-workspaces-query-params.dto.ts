import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';
import type { WorkspaceSortKey } from 'src/domain/workspaces/application/ports/workspaces-repository.port';

export class FindAllWorkspacesQueryParamsDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsIn(['updatedAt', 'createdAt', 'name'])
  sort?: WorkspaceSortKey;

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
}
