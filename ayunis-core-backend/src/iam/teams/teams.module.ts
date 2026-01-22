import { Module } from '@nestjs/common';
import { TypeOrmModule, getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { TeamsRepository } from './application/ports/teams.repository';
import { LocalTeamsRepository } from './infrastructure/repositories/local/local-teams.repository';
import { TeamRecord } from './infrastructure/repositories/local/schema/team.record';

import { CreateTeamUseCase } from './application/use-cases/create-team/create-team.use-case';
import { UpdateTeamUseCase } from './application/use-cases/update-team/update-team.use-case';
import { DeleteTeamUseCase } from './application/use-cases/delete-team/delete-team.use-case';
import { ListTeamsUseCase } from './application/use-cases/list-teams/list-teams.use-case';

import { TeamsController } from './presenters/http/teams.controller';
import { TeamDtoMapper } from './presenters/http/mappers/team-dto.mapper';

@Module({
  imports: [TypeOrmModule.forFeature([TeamRecord])],
  controllers: [TeamsController],
  providers: [
    {
      provide: TeamsRepository,
      useFactory: (teamRepository: Repository<TeamRecord>) => {
        return new LocalTeamsRepository(teamRepository);
      },
      inject: [getRepositoryToken(TeamRecord)],
    },
    // Use cases
    CreateTeamUseCase,
    UpdateTeamUseCase,
    DeleteTeamUseCase,
    ListTeamsUseCase,
    // Mappers
    TeamDtoMapper,
  ],
  exports: [
    CreateTeamUseCase,
    UpdateTeamUseCase,
    DeleteTeamUseCase,
    ListTeamsUseCase,
    TeamsRepository,
  ],
})
export class TeamsModule {}
