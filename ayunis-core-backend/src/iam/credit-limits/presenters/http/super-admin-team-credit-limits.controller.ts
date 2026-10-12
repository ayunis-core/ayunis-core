import { GetTeamCreditLimitsOverviewUseCase } from 'src/iam/credit-limits/application/use-cases/get-team-credit-limits-overview/get-team-credit-limits-overview.use-case';
import { GetTeamCreditLimitsOverviewQuery } from 'src/iam/credit-limits/application/use-cases/get-team-credit-limits-overview/get-team-credit-limits-overview.query';
import { TeamCreditLimitItemDto } from './dtos/credit-limit-item.dto';
import {
  Body,
  Controller,
  Delete,
  HttpCode,
  Get,
  Param,
  ParseUUIDPipe,
  Put,
} from '@nestjs/common';
import { ApiResponse, ApiTags } from '@nestjs/swagger';
import type { UUID } from 'crypto';
import { SystemRoles } from 'src/iam/authorization/application/decorators/system-roles.decorator';
import { SystemRole } from 'src/iam/users/domain/value-objects/system-role.enum';
import { SetTeamCreditLimitUseCase } from 'src/iam/credit-limits/application/use-cases/set-team-credit-limit/set-team-credit-limit.use-case';
import { SetTeamCreditLimitCommand } from 'src/iam/credit-limits/application/use-cases/set-team-credit-limit/set-team-credit-limit.command';
import { RemoveTeamCreditLimitUseCase } from 'src/iam/credit-limits/application/use-cases/remove-team-credit-limit/remove-team-credit-limit.use-case';
import { RemoveTeamCreditLimitCommand } from 'src/iam/credit-limits/application/use-cases/remove-team-credit-limit/remove-team-credit-limit.command';
import { SetCreditLimitDto } from './dtos/set-credit-limit.dto';
import { TeamCreditLimitResponseDto } from './dtos/credit-limit-response.dto';
import { CreditLimitDtoMapper } from './mappers/credit-limit-dto.mapper';

@ApiTags('super-admin-credit-limits')
@SystemRoles(SystemRole.SUPER_ADMIN)
@Controller('super-admin/orgs/:orgId/credit-limits/teams')
export class SuperAdminTeamCreditLimitsController {
  constructor(
    private readonly overview: GetTeamCreditLimitsOverviewUseCase,
    private readonly setLimit: SetTeamCreditLimitUseCase,
    private readonly removeLimit: RemoveTeamCreditLimitUseCase,
    private readonly mapper: CreditLimitDtoMapper,
  ) {}

  @Get()
  @ApiResponse({ status: 200, type: [TeamCreditLimitItemDto] })
  async getTeamLimits(
    @Param('orgId', ParseUUIDPipe) orgId: UUID,
  ): Promise<TeamCreditLimitItemDto[]> {
    return this.mapper.toTeamItems(
      await this.overview.execute(
        new GetTeamCreditLimitsOverviewQuery(undefined, orgId),
      ),
    );
  }

  @Put(':teamId')
  @ApiResponse({ status: 200, type: TeamCreditLimitResponseDto })
  async setTeamLimit(
    @Param('orgId', ParseUUIDPipe) orgId: UUID,
    @Param('teamId', ParseUUIDPipe) teamId: UUID,
    @Body() dto: SetCreditLimitDto,
  ): Promise<TeamCreditLimitResponseDto> {
    return this.mapper.toTeamDto(
      await this.setLimit.execute(
        new SetTeamCreditLimitCommand(teamId, dto.monthlyCredits, orgId),
      ),
    );
  }

  @Delete(':teamId')
  @HttpCode(204)
  async removeTeamLimit(
    @Param('orgId', ParseUUIDPipe) orgId: UUID,
    @Param('teamId', ParseUUIDPipe) teamId: UUID,
  ): Promise<void> {
    await this.removeLimit.execute(
      new RemoveTeamCreditLimitCommand(teamId, orgId),
    );
  }
}
