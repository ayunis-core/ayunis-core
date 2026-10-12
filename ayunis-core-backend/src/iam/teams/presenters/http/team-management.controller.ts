import { Controller, Get } from '@nestjs/common';
import { ApiResponse, ApiTags } from '@nestjs/swagger';
import { GetTeamManagementAccessUseCase } from 'src/iam/teams/application/use-cases/get-team-management-access/get-team-management-access.use-case';
import { TeamManagementAccessDto } from './dtos/team-management-access.dto';

@ApiTags('teams')
@Controller('teams/management-access')
export class TeamManagementController {
  constructor(
    private readonly getManagementAccess: GetTeamManagementAccessUseCase,
  ) {}
  @Get()
  @ApiResponse({ status: 200, type: TeamManagementAccessDto })
  async getTeamManagementAccess(): Promise<TeamManagementAccessDto> {
    return this.getManagementAccess.execute();
  }
}
