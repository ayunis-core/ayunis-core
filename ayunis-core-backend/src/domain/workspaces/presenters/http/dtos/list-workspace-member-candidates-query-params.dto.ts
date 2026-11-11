import { IsOptional, IsString, MaxLength } from 'class-validator';

export class ListWorkspaceMemberCandidatesQueryParamsDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  search?: string;
}
