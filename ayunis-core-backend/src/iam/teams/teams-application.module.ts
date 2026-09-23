import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TeamMembersRepository } from 'src/iam/teams/application/ports/team-members.repository';
import { TeamsRepository } from 'src/iam/teams/application/ports/teams.repository';
import { AssignUserToTeamsUseCase } from 'src/iam/teams/application/use-cases/assign-user-to-teams/assign-user-to-teams.use-case';
import { AddTeamMemberUseCase } from 'src/iam/teams/application/use-cases/add-team-member/add-team-member.use-case';
import { BulkAddTeamMembersUseCase } from 'src/iam/teams/application/use-cases/bulk-add-team-members/bulk-add-team-members.use-case';
import { CheckUserTeamMembershipUseCase } from 'src/iam/teams/application/use-cases/check-user-team-membership/check-user-team-membership.use-case';
import { CreateTeamUseCase } from 'src/iam/teams/application/use-cases/create-team/create-team.use-case';
import { DeleteTeamUseCase } from 'src/iam/teams/application/use-cases/delete-team/delete-team.use-case';
import { FindAllUserIdsByTeamIdUseCase } from 'src/iam/teams/application/use-cases/find-all-user-ids-by-team-id/find-all-user-ids-by-team-id.use-case';
import { FindTeamsByOrgIdUseCase } from 'src/iam/teams/application/use-cases/find-teams-by-org-id/find-teams-by-org-id.use-case';
import { FindTeamsByUserIdUseCase } from 'src/iam/teams/application/use-cases/find-teams-by-user-id/find-teams-by-user-id.use-case';
import { GetTeamUseCase } from 'src/iam/teams/application/use-cases/get-team/get-team.use-case';
import { ListMyTeamsUseCase } from 'src/iam/teams/application/use-cases/list-my-teams/list-my-teams.use-case';
import { ListTeamMembersUseCase } from 'src/iam/teams/application/use-cases/list-team-members/list-team-members.use-case';
import { ListTeamsUseCase } from 'src/iam/teams/application/use-cases/list-teams/list-teams.use-case';
import { RemoveTeamMemberUseCase } from 'src/iam/teams/application/use-cases/remove-team-member/remove-team-member.use-case';
import { UpdateTeamUseCase } from 'src/iam/teams/application/use-cases/update-team/update-team.use-case';
import { LocalTeamMembersRepository } from 'src/iam/teams/infrastructure/repositories/local/local-team-members.repository';
import { LocalTeamsRepository } from 'src/iam/teams/infrastructure/repositories/local/local-teams.repository';
import { TeamMemberRecord } from 'src/iam/teams/infrastructure/repositories/local/schema/team-member.record';
import { TeamRecord } from 'src/iam/teams/infrastructure/repositories/local/schema/team.record';
import { UsersModule } from 'src/iam/users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([TeamRecord, TeamMemberRecord]),
    forwardRef(() => UsersModule),
  ],
  providers: [
    { provide: TeamsRepository, useClass: LocalTeamsRepository },
    { provide: TeamMembersRepository, useClass: LocalTeamMembersRepository },
    CreateTeamUseCase,
    UpdateTeamUseCase,
    DeleteTeamUseCase,
    ListTeamsUseCase,
    ListMyTeamsUseCase,
    GetTeamUseCase,
    ListTeamMembersUseCase,
    AddTeamMemberUseCase,
    BulkAddTeamMembersUseCase,
    RemoveTeamMemberUseCase,
    CheckUserTeamMembershipUseCase,
    FindAllUserIdsByTeamIdUseCase,
    FindTeamsByUserIdUseCase,
    FindTeamsByOrgIdUseCase,
    AssignUserToTeamsUseCase,
  ],
  exports: [
    CreateTeamUseCase,
    UpdateTeamUseCase,
    DeleteTeamUseCase,
    ListTeamsUseCase,
    ListMyTeamsUseCase,
    GetTeamUseCase,
    ListTeamMembersUseCase,
    AddTeamMemberUseCase,
    BulkAddTeamMembersUseCase,
    RemoveTeamMemberUseCase,
    CheckUserTeamMembershipUseCase,
    FindAllUserIdsByTeamIdUseCase,
    FindTeamsByUserIdUseCase,
    FindTeamsByOrgIdUseCase,
    AssignUserToTeamsUseCase,
  ],
})
export class TeamsApplicationModule {}
