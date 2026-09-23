import { Module } from '@nestjs/common';

import { TeamsController } from './presenters/http/teams.controller';
import { TeamDtoMapper } from './presenters/http/mappers/team-dto.mapper';
import { TeamMemberDtoMapper } from './presenters/http/mappers/team-member-dto.mapper';

import { TeamsApplicationModule } from 'src/iam/teams/teams-application.module';

@Module({
  imports: [TeamsApplicationModule],
  controllers: [TeamsController],
  providers: [TeamDtoMapper, TeamMemberDtoMapper],
  exports: [TeamsApplicationModule],
})
export class TeamsModule {}
