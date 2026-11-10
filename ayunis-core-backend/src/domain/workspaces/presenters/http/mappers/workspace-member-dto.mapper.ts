import { Injectable } from '@nestjs/common';
import type { WorkspaceMemberCandidate } from 'src/domain/workspaces/application/models/workspace-member-candidate.model';
import type { WorkspaceMemberProfile } from 'src/domain/workspaces/application/models/workspace-member-profile.model';
import { WorkspaceMemberCandidateResponseDto } from 'src/domain/workspaces/presenters/http/dtos/workspace-member-candidate-response.dto';
import { WorkspaceMemberResponseDto } from 'src/domain/workspaces/presenters/http/dtos/workspace-member-response.dto';

@Injectable()
export class WorkspaceMemberDtoMapper {
  toDto({
    member,
    name,
    email,
  }: WorkspaceMemberProfile): WorkspaceMemberResponseDto {
    const dto = new WorkspaceMemberResponseDto();
    dto.userId = member.userId;
    dto.name = name;
    dto.email = email;
    dto.role = member.role;
    dto.joinedAt = member.createdAt.toISOString();
    return dto;
  }

  toDtoList(profiles: WorkspaceMemberProfile[]): WorkspaceMemberResponseDto[] {
    return profiles.map((profile) => this.toDto(profile));
  }

  toCandidateDtoList(
    candidates: WorkspaceMemberCandidate[],
  ): WorkspaceMemberCandidateResponseDto[] {
    return candidates.map(({ userId, name, email }) => {
      const dto = new WorkspaceMemberCandidateResponseDto();
      dto.userId = userId;
      dto.name = name;
      dto.email = email;
      return dto;
    });
  }
}
