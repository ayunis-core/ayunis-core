import {
  Controller,
  Get,
  Put,
  Delete,
  Body,
  Param,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { UUID } from 'crypto';
import { Roles } from 'src/iam/authorization/application/decorators/roles.decorator';
import { UserRole } from 'src/iam/users/domain/value-objects/role.object';
import { GetCreditLimitsOverviewUseCase } from '../../application/use-cases/get-credit-limits-overview/get-credit-limits-overview.use-case';
import { SetUserCreditLimitUseCase } from '../../application/use-cases/set-user-credit-limit/set-user-credit-limit.use-case';
import { SetUserCreditLimitCommand } from '../../application/use-cases/set-user-credit-limit/set-user-credit-limit.command';
import { SetTeamCreditLimitUseCase } from '../../application/use-cases/set-team-credit-limit/set-team-credit-limit.use-case';
import { SetTeamCreditLimitCommand } from '../../application/use-cases/set-team-credit-limit/set-team-credit-limit.command';
import { RemoveCreditLimitUseCase } from '../../application/use-cases/remove-credit-limit/remove-credit-limit.use-case';
import { RemoveCreditLimitCommand } from '../../application/use-cases/remove-credit-limit/remove-credit-limit.command';
import { CreditLimitScope } from '../../domain/value-objects/credit-limit-scope.enum';
import { SetCreditLimitDto } from './dtos/set-credit-limit.dto';
import { CreditLimitResponseDto } from './dtos/credit-limit-response.dto';
import { CreditLimitsOverviewResponseDto } from './dtos/credit-limits-overview-response.dto';
import { CreditLimitDtoMapper } from './mappers/credit-limit-dto.mapper';

/**
 * Org-admin configuration of per-user and per-team monthly credit allowances.
 * Meaningful for usage-based subscriptions; the frontend hides the section for
 * seat-based orgs.
 */
@ApiTags('credit-limits')
@Controller('credit-limits')
export class CreditLimitsController {
  private readonly logger = new Logger(CreditLimitsController.name);

  constructor(
    private readonly getCreditLimitsOverviewUseCase: GetCreditLimitsOverviewUseCase,
    private readonly setUserCreditLimitUseCase: SetUserCreditLimitUseCase,
    private readonly setTeamCreditLimitUseCase: SetTeamCreditLimitUseCase,
    private readonly removeCreditLimitUseCase: RemoveCreditLimitUseCase,
    private readonly mapper: CreditLimitDtoMapper,
  ) {}

  @Roles(UserRole.ADMIN)
  @Get()
  @ApiOperation({
    summary: 'List configured credit limits with current consumption',
  })
  @ApiResponse({ status: 200, type: CreditLimitsOverviewResponseDto })
  async getOverview(): Promise<CreditLimitsOverviewResponseDto> {
    this.logger.log('Getting credit limits overview');
    const overview = await this.getCreditLimitsOverviewUseCase.execute();
    return this.mapper.toOverviewDto(overview);
  }

  @Roles(UserRole.ADMIN)
  @Put('users/:userId')
  @ApiOperation({ summary: 'Set a monthly credit limit for a user' })
  @ApiResponse({ status: 200, type: CreditLimitResponseDto })
  async setUserLimit(
    @Param('userId', ParseUUIDPipe) userId: UUID,
    @Body() dto: SetCreditLimitDto,
  ): Promise<CreditLimitResponseDto> {
    this.logger.log(`Setting credit limit for user ${userId}`);
    const limit = await this.setUserCreditLimitUseCase.execute(
      new SetUserCreditLimitCommand(userId, dto.monthlyCredits),
    );
    return this.mapper.toDto(limit);
  }

  @Roles(UserRole.ADMIN)
  @Put('teams/:teamId')
  @ApiOperation({ summary: 'Set a monthly credit limit for a team' })
  @ApiResponse({ status: 200, type: CreditLimitResponseDto })
  async setTeamLimit(
    @Param('teamId', ParseUUIDPipe) teamId: UUID,
    @Body() dto: SetCreditLimitDto,
  ): Promise<CreditLimitResponseDto> {
    this.logger.log(`Setting credit limit for team ${teamId}`);
    const limit = await this.setTeamCreditLimitUseCase.execute(
      new SetTeamCreditLimitCommand(teamId, dto.monthlyCredits),
    );
    return this.mapper.toDto(limit);
  }

  @Roles(UserRole.ADMIN)
  @Delete('users/:userId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove a user credit limit (back to unlimited)' })
  @ApiResponse({ status: 204 })
  async removeUserLimit(
    @Param('userId', ParseUUIDPipe) userId: UUID,
  ): Promise<void> {
    this.logger.log(`Removing credit limit for user ${userId}`);
    await this.removeCreditLimitUseCase.execute(
      new RemoveCreditLimitCommand(CreditLimitScope.USER, userId),
    );
  }

  @Roles(UserRole.ADMIN)
  @Delete('teams/:teamId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove a team credit limit (back to unlimited)' })
  @ApiResponse({ status: 204 })
  async removeTeamLimit(
    @Param('teamId', ParseUUIDPipe) teamId: UUID,
  ): Promise<void> {
    this.logger.log(`Removing credit limit for team ${teamId}`);
    await this.removeCreditLimitUseCase.execute(
      new RemoveCreditLimitCommand(CreditLimitScope.TEAM, teamId),
    );
  }
}
