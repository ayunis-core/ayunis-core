import { FindTeamsByUserIdsAndOrgIdUseCase } from 'src/iam/teams/application/use-cases/find-teams-by-user-ids-and-org-id/find-teams-by-user-ids-and-org-id.use-case';
import { FindTeamsByIdsAndOrgIdUseCase } from 'src/iam/teams/application/use-cases/find-teams-by-ids-and-org-id/find-teams-by-ids-and-org-id.use-case';
import { TeamMemberCreationService } from 'src/iam/teams/application/services/team-member-creation.service';
import { GetTeamManagementAccessUseCase } from 'src/iam/teams/application/use-cases/get-team-management-access/get-team-management-access.use-case';
import { AssertTeamManagementAllowedUseCase } from 'src/iam/teams/application/use-cases/assert-team-management-allowed/assert-team-management-allowed.use-case';
import { OrgsModule } from 'src/iam/orgs/orgs.module';
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
import { FindAllUserIdsByTeamIdsUseCase } from 'src/iam/teams/application/use-cases/find-all-user-ids-by-team-ids/find-all-user-ids-by-team-ids.use-case';
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
    OrgsModule,
  ],
  providers: [
    TeamMemberCreationService,
    { provide: TeamsRepository, useClass: LocalTeamsRepository },
    { provide: TeamMembersRepository, useClass: LocalTeamMembersRepository },
    GetTeamManagementAccessUseCase,
    AssertTeamManagementAllowedUseCase,
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
    FindAllUserIdsByTeamIdsUseCase,
    FindTeamsByUserIdUseCase,
    FindTeamsByOrgIdUseCase,
    FindTeamsByIdsAndOrgIdUseCase,
    FindTeamsByUserIdsAndOrgIdUseCase,
    AssignUserToTeamsUseCase,
  ],
  exports: [
    GetTeamManagementAccessUseCase,
    AssertTeamManagementAllowedUseCase,
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
    FindAllUserIdsByTeamIdsUseCase,
    FindTeamsByUserIdUseCase,
    FindTeamsByOrgIdUseCase,
    FindTeamsByIdsAndOrgIdUseCase,
    FindTeamsByUserIdsAndOrgIdUseCase,
    AssignUserToTeamsUseCase,
  ],
})
export class TeamsApplicationModule {}
