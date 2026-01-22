import { Module } from '@nestjs/common';
import { TypeOrmModule, getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { TeamsRepository } from './application/ports/teams.repository';
import { TeamMembersRepository } from './application/ports/team-members.repository';
import { LocalTeamsRepository } from './infrastructure/repositories/local/local-teams.repository';
import { LocalTeamMembersRepository } from './infrastructure/repositories/local/local-team-members.repository';
import { TeamRecord } from './infrastructure/repositories/local/schema/team.record';
import { TeamMemberRecord } from './infrastructure/repositories/local/schema/team-member.record';

import { CreateTeamUseCase } from './application/use-cases/create-team/create-team.use-case';
import { UpdateTeamUseCase } from './application/use-cases/update-team/update-team.use-case';
import { DeleteTeamUseCase } from './application/use-cases/delete-team/delete-team.use-case';
import { ListTeamsUseCase } from './application/use-cases/list-teams/list-teams.use-case';
import { ListMyTeamsUseCase } from './application/use-cases/list-my-teams/list-my-teams.use-case';
import { GetTeamUseCase } from './application/use-cases/get-team/get-team.use-case';
import { ListTeamMembersUseCase } from './application/use-cases/list-team-members/list-team-members.use-case';
import { AddTeamMemberUseCase } from './application/use-cases/add-team-member/add-team-member.use-case';
import { RemoveTeamMemberUseCase } from './application/use-cases/remove-team-member/remove-team-member.use-case';

import { TeamsController } from './presenters/http/teams.controller';
import { TeamDtoMapper } from './presenters/http/mappers/team-dto.mapper';
import { TeamMemberDtoMapper } from './presenters/http/mappers/team-member-dto.mapper';

import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([TeamRecord, TeamMemberRecord]),
    UsersModule,
  ],
  controllers: [TeamsController],
  providers: [
    {
      provide: TeamsRepository,
      useFactory: (teamRepository: Repository<TeamRecord>) => {
        return new LocalTeamsRepository(teamRepository);
      },
      inject: [getRepositoryToken(TeamRecord)],
    },
    {
      provide: TeamMembersRepository,
      useClass: LocalTeamMembersRepository,
    },
    // Use cases
    CreateTeamUseCase,
    UpdateTeamUseCase,
    DeleteTeamUseCase,
    ListTeamsUseCase,
    ListMyTeamsUseCase,
    GetTeamUseCase,
    ListTeamMembersUseCase,
    AddTeamMemberUseCase,
    RemoveTeamMemberUseCase,
    // Mappers
    TeamDtoMapper,
    TeamMemberDtoMapper,
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
    RemoveTeamMemberUseCase,
  ],
})
export class TeamsModule {}
